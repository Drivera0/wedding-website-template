import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase";
import { adminKey } from "./adminKey";
import { DEMO, demoRpc } from "./demo";
import { CONTENT_DEFAULTS } from "../data/content";
import { SITE_URL, WEDDING } from "../config";

// ============================================================
//  INVITATIONS
// ============================================================
//  Each guest gets a personalised link, /i/<code>. Opening it unlocks the
//  site and pre-fills their RSVP, so nobody has to type a password or a code.
//
//  The invitations table itself is not readable with the public key: it holds
//  the guest list and their contact details, and that key ships in the browser
//  bundle. Everything here goes through database functions that return only
//  what the caller is entitled to see.
//
//  One invitation gets exactly one RSVP, for at most its party size. The
//  database enforces that (scripts/one-rsvp-per-invitation.sql), so a reused
//  link or a hand-crafted request is refused no matter what the browser does.
// ============================================================

const headers = {
  "Content-Type": "application/json",
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

async function rpc<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  if (DEMO) return demoRpc<T>(fn, body);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text.includes("unauthorised") ? "Not authorised" : `${fn} failed: ${res.status}`);
  }
  // Functions that return void answer 204 with an empty body, and res.json()
  // throws on that.
  const raw = await res.text();
  return (raw ? JSON.parse(raw) : null) as T;
}

// ── Types ───────────────────────────────────────────────────

export type SendVia = "whatsapp" | "email" | "both" | "in_person";

export const SEND_VIA_LABEL: Record<SendVia, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  both: "WhatsApp + email",
  in_person: "In person",
};

export const SIDES = [WEDDING.coupleFirst, WEDDING.coupleSecond, "Both"];
export const GROUPS = ["Family", "Friends", "Work", "Other"];

export interface InviteResponse {
  id: string;
  rsvp_seq: number;
  name: string;
  email: string | null;
  status: "confirmed" | "declined" | "pending";
  song_request: string | null;
  notes: string | null;
  created_at: string;
  dietary: string[];
  dietary_other: string | null;
  party_size: number;
  plus_ones: {
    name: string;
    song_request: string | null;
    dietary: string[];
    dietary_other: string | null;
  }[];
}

export interface Invitation {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  send_via: SendVia | null;
  side: string | null;
  guest_group: string | null;
  max_additional: number;
  sent_at: string | null;
  opened_at: string | null;
  responded_at: string | null;
  guest_id: string | null;
  notes: string | null;
  created_at: string;
  /** Their RSVP, once they have sent one. */
  guest: InviteResponse | null;
}

/** Everything the admin types in about an invitation. */
export interface InvitationDetails {
  name: string;
  email: string;
  phone: string;
  /** Total people on the invitation, including the guest. */
  party: number;
  sendVia: SendVia | "";
  side: string;
  group: string;
  notes: string;
}

/** What a guest's browser is allowed to know about their own invitation. */
export interface ResolvedInvite {
  code: string;
  name: string;
  email: string | null;
  maxAdditional: number;
  responded: boolean;
}

// Party size is shown and entered as a TOTAL; the database stores the number
// of ADDITIONAL guests. These two are the only place that conversion happens.
export const toParty = (maxAdditional: number) => maxAdditional + 1;
export const toAdditional = (party: number) => Math.max(0, party - 1);

export const detailsOf = (r: Invitation): InvitationDetails => ({
  name: r.name,
  email: r.email ?? "",
  phone: r.phone ?? "",
  party: toParty(r.max_additional),
  sendVia: r.send_via ?? "",
  side: r.side ?? "",
  group: r.guest_group ?? "",
  notes: r.notes ?? "",
});

// ── Guest side ──────────────────────────────────────────────

type ResolveRow = {
  name: string;
  email: string | null;
  max_additional: number;
  responded: boolean;
};

/** Look up a code. Returns null when it isn't a real invitation. */
export async function resolveInvitation(code: string): Promise<ResolvedInvite | null> {
  const rows = await rpc<ResolveRow[]>("resolve_invitation", { p_code: code.trim() });
  const row = rows?.[0];
  if (!row) return null;
  return {
    code: code.trim().toUpperCase(),
    name: row.name,
    email: row.email,
    maxAdditional: row.max_additional,
    responded: row.responded,
  };
}

// ── The invite held in this browser ─────────────────────────

const INVITE_KEY = "wedding-invite";
export const AUTH_KEY = "wedding-auth";

//  Stored in localStorage rather than sessionStorage so an invited guest stays
//  signed in between visits. They will want to come back and check the venue,
//  the dress code or the travel notes long after they have RSVP'd, and
//  reopening their original link works every time regardless.
export function storeInvite(invite: ResolvedInvite) {
  try {
    localStorage.setItem(INVITE_KEY, JSON.stringify(invite));
    localStorage.setItem(AUTH_KEY, "true"); // a valid invite is the login
  } catch {
    /* private mode: they can still use the shared password */
  }
}

export function getInvite(): ResolvedInvite | null {
  try {
    const raw =
      localStorage.getItem(INVITE_KEY) ?? sessionStorage.getItem(INVITE_KEY);
    return raw ? (JSON.parse(raw) as ResolvedInvite) : null;
  } catch {
    return null;
  }
}

export function clearInvite() {
  try {
    localStorage.removeItem(INVITE_KEY);
    sessionStorage.removeItem(INVITE_KEY);
  } catch {
    /* ignore */
  }
}

// ── Admin side ──────────────────────────────────────────────
//  These pass the admin password through to the database, which checks it
//  before returning anything.

const detailsParams = (d: InvitationDetails) => ({
  p_name: d.name.trim(),
  p_email: d.email.trim(),
  p_phone: d.phone.trim(),
  p_max_additional: toAdditional(d.party),
  p_send_via: d.sendVia,
  p_side: d.side,
  p_group: d.group,
  p_notes: d.notes.trim(),
});

export const listInvitations = () =>
  rpc<Invitation[]>("admin_list_invitations", { p_key: adminKey() });

export const addInvitation = async (d: InvitationDetails) => {
  const row = await rpc<Invitation>("admin_add_invitation", { p_key: adminKey(), ...detailsParams(d) });
  return { ...row, guest: null };
};

export const updateInvitation = (id: string, d: InvitationDetails) =>
  rpc<void>("admin_update_invitation", { p_key: adminKey(), p_id: id, ...detailsParams(d) });

/** Adds many at once. Names already on the list are skipped, not duplicated. */
export async function importInvitations(rows: InvitationDetails[]) {
  const res = await rpc<{ added: Invitation[]; skipped: string[] }>("admin_import_invitations", {
    p_key: adminKey(),
    p_rows: rows.map((d) => ({
      name: d.name.trim(),
      email: d.email.trim(),
      phone: d.phone.trim(),
      send_via: d.sendVia,
      side: d.side,
      guest_group: d.group,
      notes: d.notes.trim(),
      max_additional: toAdditional(d.party),
    })),
  });
  return { added: res.added.map((r) => ({ ...r, guest: null })), skipped: res.skipped };
}

export const deleteInvitation = (id: string) =>
  rpc<void>("admin_delete_invitation", { p_key: adminKey(), p_id: id });

export const markSent = (ids: string[], sent = true) =>
  rpc<void>("admin_mark_sent", { p_key: adminKey(), p_ids: ids, p_sent: sent });

/**
 * Deletes someone's RSVP and reopens their invitation, so their link works one
 * more time. This is the only way a guest can change an answer they sent.
 */
export const reopenInvitation = (guestId: string) =>
  rpc<void>("admin_delete_guest", { p_key: adminKey(), p_id: guestId });

// ── Links and messages ──────────────────────────────────────

const siteOrigin = () => SITE_URL.replace(/\/+$/, "") || window.location.origin;

/** The personalised link that goes in the message. */
export function inviteUrl(code: string, origin = siteOrigin()) {
  return `${origin}/i/${code}`;
}

/** True when links would point at this computer instead of the real site. */
export const linksPointAtLocalhost = () => /localhost|127\.0\.0\.1/.test(siteOrigin());

export function partyLine(party: number) {
  if (party <= 1) return "This invitation is for you.";
  if (party === 2) return "This invitation is for you and one guest.";
  return `This invitation is for ${party} people, including you.`;
}

export type MessageKind = "invite" | "reminder";

/**
 * The invitation (or reminder) text, filled in for one guest. Wording lives in
 * content.ts under "invite." and "invite.reminder.".
 */
export function inviteMessage(r: Pick<Invitation, "name" | "code" | "max_additional">, kind: MessageKind = "invite") {
  const vars: Record<string, string> = {
    firstName: r.name.trim().split(/\s+/)[0] || "there",
    couple: `${WEDDING.coupleFirst} & ${WEDDING.coupleSecond}`,
    date: WEDDING.dateShort,
    venue: WEDDING.venueCity,
    deadline: CONTENT_DEFAULTS["invite.deadline"],
    party: partyLine(toParty(r.max_additional)),
    link: inviteUrl(r.code),
    code: r.code,
  };
  const prefix = kind === "reminder" ? "invite.reminder." : "invite.";
  const fill = (key: string) =>
    (CONTENT_DEFAULTS[prefix + key] ?? "").replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
  return {
    whatsapp: fill("whatsapp"),
    subject: fill("email.subject"),
    email: fill("email.body"),
  };
}

// ── Reminders ───────────────────────────────────────────────
//  When a reminder was last sent is remembered in this browser only. It is a
//  nudge for whoever is doing the sending, not guest data, so it doesn't need
//  a database column.

const REMINDED_KEY = "wedding-admin-reminded";

export function getReminded(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(REMINDED_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

export function markReminded(id: string) {
  const all = getReminded();
  all[id] = new Date().toISOString();
  try {
    localStorage.setItem(REMINDED_KEY, JSON.stringify(all));
  } catch {
    /* private mode: the reminder still went out */
  }
  return all;
}

/** Sent, not answered, and there's a way to reach them. */
export const needsReminder = (r: Invitation) => Boolean(r.sent_at && !r.guest && !r.responded_at);

/**
 * Plus one names saved by the spreadsheet import, which appends
 * "Plus ones: Jane Doe, John Doe" to the invitation's notes.
 */
export function expectedPlusOnes(notes: string | null): string[] {
  const match = (notes ?? "").match(/Plus ones: (.+)$/);
  return match ? match[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
}

/** Digits only, the way wa.me wants it: country code first, no plus. */
export function phoneDigits(phone: string | null) {
  const raw = (phone ?? "").trim();
  let digits = raw.replace(/\D/g, "");
  if (!raw.startsWith("+") && digits.startsWith("00")) digits = digits.slice(2);
  return digits;
}

/** Why a phone number won't work on WhatsApp, or null if it looks fine. */
export function phoneProblem(phone: string | null): string | null {
  const raw = (phone ?? "").trim();
  if (!raw) return null;
  const digits = phoneDigits(raw);
  if (!raw.startsWith("+") && !raw.startsWith("00")) return "Add the country code, e.g. +1";
  if (digits.length < 8 || digits.length > 15) return "Doesn't look like a full number";
  return null;
}

export const emailLooksValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

/** Opens WhatsApp (app or web) with the message typed out, ready to send. */
export function whatsappUrl(phone: string | null, text: string) {
  return `https://wa.me/${phoneDigits(phone)}?text=${encodeURIComponent(text)}`;
}

/**
 * Opens Gmail's compose window in the browser with the message typed out.
 * Uses whichever Google account is signed in (the first one, if several).
 */
export function gmailUrl(email: string | null, subject: string, body: string) {
  const params = new URLSearchParams({ view: "cm", fs: "1", to: (email ?? "").trim(), su: subject, body });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/** Opens the default mail app with the message typed out, ready to send. */
export function mailtoUrl(email: string | null, subject: string, body: string) {
  return `mailto:${(email ?? "").trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Which channels an invitation can actually be sent on right now. */
export function channelsFor(r: Invitation) {
  const hasPhone = Boolean(r.phone && !phoneProblem(r.phone));
  const hasEmail = Boolean(r.email && emailLooksValid(r.email));
  const wants = r.send_via;
  return {
    whatsapp: hasPhone && wants !== "email" && wants !== "in_person",
    email: hasEmail && wants !== "whatsapp" && wants !== "in_person",
  };
}

/**
 * A mail-merge sheet. Import into Google Sheets, then run the Apps Script in
 * scripts/gmail-mail-merge.gs to send from your own Gmail.
 */
export function invitationsCsv(rows: Invitation[]) {
  const esc = (v: string | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = [
    "name", "email", "phone", "send_via", "code", "link", "guests_allowed",
    "side", "group", "sent", "opened", "responded",
  ];
  const body = rows.map((r) =>
    [
      esc(r.name),
      esc(r.email),
      esc(r.phone),
      esc(r.send_via),
      esc(r.code),
      esc(inviteUrl(r.code)),
      String(toParty(r.max_additional)),
      esc(r.side),
      esc(r.guest_group),
      r.sent_at ? "yes" : "",
      r.opened_at ? "yes" : "",
      r.responded_at ? "yes" : "",
    ].join(",")
  );
  return [header.join(","), ...body].join("\n");
}

/** Saves text as a file download from the admin page. */
export function downloadFile(name: string, text: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
