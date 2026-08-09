// ============================================================
//  DEMO MODE
// ============================================================
//  When no Supabase project is configured (no VITE_SUPABASE_URL), every
//  database call is answered here instead, from made-up guests and
//  invitations kept in this browser's sessionStorage. That lets the whole site,
//  including the admin dashboard and the RSVP form, be tried without a
//  backend. The admin password in demo mode is "demo".
//
//  Each handler mirrors the matching database function in scripts/*.sql, so
//  the dashboard behaves the same way it does against the real thing.
// ============================================================

import type { Guest, GuestDietary, PlusOne } from "./supabase";
import { FALLBACK_DIETARY_OPTIONS } from "./supabase";
import type { Invitation, InviteResponse } from "./invitations";

export const DEMO = !import.meta.env.VITE_SUPABASE_URL;
export const DEMO_ADMIN_PASSWORD = "demo";

const STORE_KEY = "wedding-demo-db";

interface Db {
  invitations: Omit<Invitation, "guest">[];
  guests: Omit<Guest, "plus_ones" | "guest_dietary">[];
  plusOnes: Omit<PlusOne, "guest_dietary">[];
  /** person id (guest or plus one) → dietary option ids */
  dietary: Record<string, number[]>;
}

let db: Db | null = null;
let seq = 0;

const uid = () => `demo-${Date.now().toString(36)}-${(seq++).toString(36)}`;
const now = () => new Date().toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

function code() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ── Seed data ───────────────────────────────────────────────

type SeedGuest = {
  /** Who filled in the form, when not the invitation name. */
  name?: string;
  status: "confirmed" | "declined";
  email?: string;
  song?: string;
  dietary?: number[];
  other?: string;
  table?: string;
  plusOnes?: { name: string; song?: string; dietary?: number[]; table?: string }[];
};

type SeedInvite = {
  name: string;
  email?: string;
  phone?: string;
  via: Invitation["send_via"];
  side: string;
  group: string;
  party: number;
  sent?: number;
  opened?: number;
  notes?: string;
  rsvp?: SeedGuest;
};

const SEED: SeedInvite[] = [
  { name: "Emma Thompson", email: "emma.t@demo.com", phone: "+1 555 010 0101", via: "both", side: "Alex", group: "Family", party: 2, sent: 40, opened: 39,
    rsvp: { status: "confirmed", email: "emma.t@demo.com", song: "September, Earth, Wind & Fire", dietary: [1], table: "1",
      plusOnes: [{ name: "James Thompson", song: "Mr. Brightside, The Killers", table: "1" }] } },
  { name: "Liam Carter", phone: "+1 555 010 0102", via: "whatsapp", side: "Sam", group: "Friends", party: 1, sent: 38, opened: 37,
    rsvp: { status: "confirmed", song: "Dancing Queen, ABBA", table: "3" } },
  { name: "Olivia & Noah Walker", email: "noah.w@demo.com", via: "email", side: "Both", group: "Friends", party: 2, sent: 38, opened: 30,
    rsvp: { name: "Noah Walker", status: "confirmed", email: "noah.w@demo.com", dietary: [3], other: "Coeliac, please no cross-contamination", table: "2",
      plusOnes: [{ name: "Olivia Walker", dietary: [2], song: "Shut Up and Dance, Walk the Moon", table: "2" }] } },
  { name: "Sophia Anderson", email: "sophia.a@demo.com", phone: "+1 555 010 0104", via: "both", side: "Alex", group: "Work", party: 1, sent: 35, opened: 34,
    rsvp: { status: "declined", email: "sophia.a@demo.com" } },
  { name: "The Martinez Family", phone: "+1 555 010 0105", via: "whatsapp", side: "Sam", group: "Family", party: 4, sent: 35, opened: 33,
    notes: "Plus ones: Lucas Martinez, Mia Martinez, Leo Martinez",
    rsvp: { name: "Carlos Martinez", status: "confirmed", song: "Uptown Funk, Bruno Mars", dietary: [5], table: "4",
      plusOnes: [
        { name: "Lucas Martinez", table: "4" },
        { name: "Mia Martinez", dietary: [1], table: "4" },
        { name: "Leo Martinez", song: "Happy, Pharrell Williams", table: "4" },
      ] } },
  { name: "Charlotte Davis", email: "charlotte.d@demo.com", via: "email", side: "Alex", group: "Friends", party: 2, sent: 30, opened: 29,
    rsvp: { status: "confirmed", email: "charlotte.d@demo.com", song: "Valerie, Amy Winehouse",
      plusOnes: [{ name: "Ben Harris", dietary: [7] }] } },
  { name: "Ethan Wilson", phone: "+1 555 010 0107", via: "whatsapp", side: "Sam", group: "Work", party: 1, sent: 28, opened: 20,
    rsvp: { status: "declined" } },
  { name: "Isabella Garcia", email: "isabella.g@demo.com", phone: "+1 555 010 0108", via: "both", side: "Both", group: "Friends", party: 2, sent: 25, opened: 24,
    rsvp: { status: "confirmed", email: "isabella.g@demo.com", dietary: [2, 4], song: "Can't Stop the Feeling!, Justin Timberlake",
      plusOnes: [{ name: "Ryan Kim" }] } },
  { name: "William Moore", email: "william.m@demo.com", via: "email", side: "Alex", group: "Family", party: 2, sent: 20, opened: 12 },
  { name: "Amelia Taylor", phone: "+1 555 010 0110", via: "whatsapp", side: "Sam", group: "Friends", party: 1, sent: 20 },
  { name: "Grandma Rose", via: "in_person", side: "Alex", group: "Family", party: 1, sent: 18, opened: 18,
    rsvp: { status: "confirmed", dietary: [6], table: "1" } },
  { name: "Benjamin Lee", email: "benjamin.l@demo.com", phone: "+1 555 010 0112", via: "both", side: "Sam", group: "Work", party: 2, sent: 10 },
  { name: "Harper Clark", phone: "+1 555 010 0113", via: "whatsapp", side: "Both", group: "Friends", party: 1 },
  { name: "Jack & Chloe Evans", email: "jack.e@demo.com", via: "email", side: "Alex", group: "Friends", party: 2,
    notes: "Plus ones: Chloe Evans" },
  { name: "Mason Wright", phone: "555 0115", via: "whatsapp", side: "Sam", group: "Other", party: 1 },
];

function seed(): Db {
  const d: Db = { invitations: [], guests: [], plusOnes: [], dietary: {} };
  let rsvpSeq = 0;
  SEED.forEach((s, i) => {
    const created = daysAgo(45 - i);
    let guestId: string | null = null;
    let respondedAt: string | null = null;
    if (s.rsvp) {
      guestId = uid();
      respondedAt = daysAgo(Math.max(1, (s.opened ?? 10) - 2));
      d.guests.push({
        id: guestId,
        rsvp_seq: ++rsvpSeq,
        name: s.rsvp.name ?? s.name,
        email: s.rsvp.email ?? null,
        phone: s.phone ?? null,
        dietary_restrictions: s.rsvp.other ?? null,
        status: s.rsvp.status,
        notes: null,
        song_request: s.rsvp.song ?? null,
        table_name: s.rsvp.table ?? null,
        response_date: respondedAt,
        created_at: respondedAt,
      });
      d.dietary[guestId] = s.rsvp.dietary ?? [];
      for (const po of s.rsvp.plusOnes ?? []) {
        const id = uid();
        d.plusOnes.push({
          id, guest_id: guestId, name: po.name, dietary_restrictions: null,
          song_request: po.song ?? null, table_name: po.table ?? null, created_at: respondedAt,
        });
        d.dietary[id] = po.dietary ?? [];
      }
    }
    d.invitations.push({
      id: uid(),
      code: code(),
      name: s.name,
      email: s.email ?? null,
      phone: s.phone ?? null,
      send_via: s.via,
      side: s.side,
      guest_group: s.group,
      max_additional: s.party - 1,
      sent_at: s.sent ? daysAgo(s.sent) : null,
      opened_at: s.opened ? daysAgo(s.opened) : null,
      responded_at: respondedAt,
      guest_id: guestId,
      notes: s.notes ?? null,
      created_at: created,
    });
  });
  return d;
}

function load(): Db {
  if (db) return db;
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (raw) db = JSON.parse(raw) as Db;
  } catch { /* fall through to a fresh seed */ }
  if (!db) db = seed();
  return db;
}

function save() {
  try { sessionStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch { /* ignore */ }
}

// ── Shaping rows the way the database functions return them ──

function dietaryRows(personId: string, isPlusOne: boolean): GuestDietary[] {
  return (load().dietary[personId] ?? []).flatMap((optId) => {
    const opt = FALLBACK_DIETARY_OPTIONS.find((o) => o.id === optId);
    return opt
      ? [{ id: `${personId}-${optId}`, guest_id: isPlusOne ? null : personId, plus_one_id: isPlusOne ? personId : null, dietary_option_id: optId, dietary_options: opt }]
      : [];
  });
}

const dietaryNames = (personId: string) => dietaryRows(personId, false).map((r) => r.dietary_options.name);

function fullGuest(g: Db["guests"][number]): Guest {
  const plus_ones = load().plusOnes
    .filter((p) => p.guest_id === g.id)
    .map((p) => ({ ...p, guest_dietary: dietaryRows(p.id, true) }));
  return { ...g, plus_ones, guest_dietary: dietaryRows(g.id, false) };
}

function inviteResponse(guestId: string | null): InviteResponse | null {
  const g = guestId && load().guests.find((x) => x.id === guestId);
  if (!g) return null;
  const pos = load().plusOnes.filter((p) => p.guest_id === g.id);
  return {
    id: g.id, rsvp_seq: g.rsvp_seq, name: g.name, email: g.email, status: g.status,
    song_request: g.song_request, notes: g.notes, created_at: g.created_at,
    dietary: dietaryNames(g.id), dietary_other: g.dietary_restrictions,
    party_size: 1 + pos.length,
    plus_ones: pos.map((p) => ({ name: p.name, song_request: p.song_request, dietary: dietaryNames(p.id), dietary_other: p.dietary_restrictions })),
  };
}

const withGuest = (i: Db["invitations"][number]): Invitation => ({ ...i, guest: inviteResponse(i.guest_id) });

const findInvite = (c: unknown) => load().invitations.find((i) => i.code.toLowerCase() === String(c ?? "").trim().toLowerCase());

const str = (v: unknown) => {
  const s = String(v ?? "").trim();
  return s ? s : null;
};

function deleteGuest(id: string) {
  const d = load();
  for (const inv of d.invitations) {
    if (inv.guest_id === id) { inv.guest_id = null; inv.responded_at = null; }
  }
  const poIds = d.plusOnes.filter((p) => p.guest_id === id).map((p) => p.id);
  d.plusOnes = d.plusOnes.filter((p) => p.guest_id !== id);
  d.guests = d.guests.filter((g) => g.id !== id);
  for (const k of [id, ...poIds]) delete d.dietary[k];
}

function newInvitation(r: Record<string, unknown>): Db["invitations"][number] {
  return {
    id: uid(), code: code(),
    name: String(r.name ?? "").trim(),
    email: str(r.email), phone: str(r.phone), send_via: str(r.send_via) as Invitation["send_via"],
    side: str(r.side), guest_group: str(r.guest_group),
    max_additional: Math.max(0, Number(r.max_additional) || 0),
    sent_at: null, opened_at: null, responded_at: null, guest_id: null,
    notes: str(r.notes), created_at: now(),
  };
}

// ── The fake database functions ─────────────────────────────

type Body = Record<string, unknown>;

const handlers: Record<string, (b: Body) => unknown> = {
  admin_check_key: (b) => b.p_key === DEMO_ADMIN_PASSWORD,

  admin_list_guests: () => [...load().guests].sort((a, b) => b.rsvp_seq - a.rsvp_seq).map(fullGuest),
  admin_delete_guest: (b) => deleteGuest(String(b.p_id)),
  admin_clear_guests: () => [...load().guests].forEach((g) => deleteGuest(g.id)),
  admin_update_guest_status: (b) => {
    const g = load().guests.find((x) => x.id === b.p_id);
    if (g) g.status = b.p_status as Guest["status"];
  },
  admin_update_guest_notes: (b) => {
    const g = load().guests.find((x) => x.id === b.p_id);
    if (g) g.notes = str(b.p_notes);
  },
  admin_set_table: (b) => {
    const d = load();
    const person = d.guests.find((x) => x.id === b.p_id) ?? d.plusOnes.find((x) => x.id === b.p_id);
    if (person) person.table_name = str(b.p_table);
  },

  admin_list_invitations: () =>
    [...load().invitations].sort((a, b) => b.created_at.localeCompare(a.created_at)).map(withGuest),
  admin_add_invitation: (b) => {
    if (!str(b.p_name)) throw new Error("NAME_REQUIRED");
    const inv = newInvitation({
      name: b.p_name, email: b.p_email, phone: b.p_phone, send_via: b.p_send_via,
      side: b.p_side, guest_group: b.p_group, notes: b.p_notes, max_additional: b.p_max_additional,
    });
    load().invitations.push(inv);
    return inv;
  },
  admin_update_invitation: (b) => {
    const inv = load().invitations.find((x) => x.id === b.p_id);
    if (!inv) return;
    inv.name = str(b.p_name) ?? inv.name;
    inv.email = str(b.p_email);
    inv.phone = str(b.p_phone);
    inv.send_via = str(b.p_send_via) as Invitation["send_via"];
    inv.side = str(b.p_side);
    inv.guest_group = str(b.p_group);
    inv.max_additional = Math.max(0, Number(b.p_max_additional ?? inv.max_additional) || 0);
    inv.notes = str(b.p_notes);
  },
  admin_delete_invitation: (b) => {
    const d = load();
    d.invitations = d.invitations.filter((x) => x.id !== b.p_id);
  },
  admin_mark_sent: (b) => {
    const ids = (b.p_ids as string[]) ?? [];
    for (const inv of load().invitations) {
      if (ids.includes(inv.id)) inv.sent_at = b.p_sent === false ? null : inv.sent_at ?? now();
    }
  },
  admin_import_invitations: (b) => {
    const d = load();
    const added: Db["invitations"][number][] = [];
    const skipped: string[] = [];
    for (const r of (b.p_rows as Body[]) ?? []) {
      const name = String(r.name ?? "").trim();
      if (!name) continue;
      if (d.invitations.some((i) => i.name.toLowerCase() === name.toLowerCase())) { skipped.push(name); continue; }
      const inv = newInvitation(r);
      d.invitations.push(inv);
      added.push(inv);
    }
    return { added, skipped };
  },

  resolve_invitation: (b) => {
    const inv = findInvite(b.p_code);
    if (!inv) return [];
    inv.opened_at ??= now();
    return [{ name: inv.name, email: inv.email, max_additional: inv.max_additional, responded: !!(inv.responded_at || inv.guest_id) }];
  },
  submit_rsvp: (b) => {
    if (!str(b.p_invite_code)) throw new Error("INVITE_REQUIRED");
    const inv = findInvite(b.p_invite_code);
    if (!inv) throw new Error("INVITE_INVALID");
    if (inv.guest_id || inv.responded_at) throw new Error("ALREADY_RESPONDED");
    if (!str(b.p_name)) throw new Error("NAME_REQUIRED");
    const attending = !!b.p_attending;
    const plusOnes = ((b.p_plus_ones as Body[]) ?? []).filter((p) => str(p.name));
    if (attending && plusOnes.length > inv.max_additional) throw new Error("TOO_MANY_GUESTS");

    const d = load();
    const id = uid();
    d.guests.push({
      id,
      rsvp_seq: Math.max(0, ...d.guests.map((g) => g.rsvp_seq)) + 1,
      name: String(b.p_name).trim(),
      email: str(b.p_email)?.toLowerCase() ?? null,
      phone: inv.phone,
      dietary_restrictions: attending ? str(b.p_dietary_other) : null,
      status: attending ? "confirmed" : "declined",
      notes: null,
      song_request: str(b.p_song),
      table_name: null,
      response_date: now(),
      created_at: now(),
    });
    d.dietary[id] = attending ? ((b.p_dietary_ids as number[]) ?? []) : [];
    if (attending) {
      for (const p of plusOnes) {
        const poId = uid();
        d.plusOnes.push({
          id: poId, guest_id: id, name: String(p.name).trim(),
          dietary_restrictions: str(p.dietary_other), song_request: str(p.song_request),
          table_name: null, created_at: now(),
        });
        d.dietary[poId] = (p.dietary_option_ids as number[]) ?? [];
      }
    }
    inv.guest_id = id;
    inv.responded_at = now();
    return id;
  },
};

/** Answers a database function call from the demo data. */
export async function demoRpc<T>(fn: string, body: Body): Promise<T> {
  const handler = handlers[fn];
  if (!handler) throw new Error(`${fn} is not available in the demo`);
  // A short pause so loading states show the way they would over the network.
  await new Promise((r) => setTimeout(r, 150));
  const result = handler(body);
  save();
  return structuredClone(result ?? null) as T;
}
