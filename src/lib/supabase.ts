import { adminKey } from "./adminKey";
import { DEMO, demoRpc } from "./demo";

// Set these in .env.local (see .env.example) or in your hosting provider.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const headers = {
  "Content-Type": "application/json",
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

// Guest names, emails, dietary needs and song requests are not readable with
// the public key. Everything that touches them goes through a database function
// that decides what the caller may see or change. See the migration
// "secure_rsvp_and_admin_via_functions".
async function rpc<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  if (DEMO) return demoCall<T>(fn, body);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    // These codes come from submit_rsvp. ALREADY_RESPONDED is also recognised
    // by the RSVP form, which switches to its "you've already replied" screen.
    if (text.includes("ALREADY_RESPONDED")) throw new Error("ALREADY_RESPONDED");
    if (text.includes("TOO_MANY_GUESTS")) {
      throw new Error("That's more guests than your invitation allows.");
    }
    if (text.includes("INVITE_REQUIRED") || text.includes("INVITE_INVALID")) {
      throw new Error("We couldn't match this to an invitation. Please open the link from your invitation again.");
    }
    if (text.includes("EMAIL_INVALID")) throw new Error("Please enter a valid email.");
    if (text.includes("NAME_REQUIRED")) throw new Error("Please enter your name.");
    if (text.includes("unauthorised")) throw new Error("Not authorised. Please sign in again.");
    throw new Error(`${fn} failed: ${res.status}`);
  }
  const raw = await res.text();
  return (raw ? JSON.parse(raw) : null) as T;
}

// Demo mode throws the same error codes the database raises; turn them into
// the same messages.
async function demoCall<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  try {
    return await demoRpc<T>(fn, body);
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "ALREADY_RESPONDED") throw e;
    if (code === "TOO_MANY_GUESTS") throw new Error("That's more guests than your invitation allows.");
    if (code === "INVITE_REQUIRED" || code === "INVITE_INVALID") {
      throw new Error("We couldn't match this to an invitation. Please open the link from your invitation again.");
    }
    if (code === "NAME_REQUIRED") throw new Error("Please enter your name.");
    throw e;
  }
}

// ── Types ──

export type GuestStatus = "confirmed" | "declined" | "pending";

export interface Guest {
  id: string;
  rsvp_seq: number;
  name: string;
  email: string | null;
  phone: string | null;
  dietary_restrictions: string | null;
  status: GuestStatus;
  notes: string | null;
  song_request: string | null;
  /** Seating plan, set in Admin > Guest list. */
  table_name: string | null;
  response_date: string;
  created_at: string;
  plus_ones: PlusOne[];
  guest_dietary: GuestDietary[];
}

export function formatRsvpNumber(seq: number): string {
  return `RSVP-${String(seq).padStart(3, "0")}`;
}

export interface PlusOne {
  id: string;
  guest_id: string;
  name: string;
  dietary_restrictions: string | null;
  song_request: string | null;
  table_name: string | null;
  created_at: string;
  guest_dietary: GuestDietary[];
}

export interface DietaryOption {
  id: number;
  name: string;
  sort_order: number;
}

export interface GuestDietary {
  id: string;
  guest_id: string | null;
  plus_one_id: string | null;
  dietary_option_id: number;
  dietary_options: DietaryOption;
}

// Built-in dietary options: used as a fallback if the DB table is empty/unreachable,
// so the picker always works. IDs match the seed order for a fresh dietary_options table.
export const FALLBACK_DIETARY_OPTIONS: DietaryOption[] = [
  { id: 1, name: "Vegetarian", sort_order: 1 },
  { id: 2, name: "Vegan", sort_order: 2 },
  { id: 3, name: "Gluten-free", sort_order: 3 },
  { id: 4, name: "Dairy-free", sort_order: 4 },
  { id: 5, name: "Nut allergy", sort_order: 5 },
  { id: 6, name: "Shellfish allergy", sort_order: 6 },
  { id: 7, name: "Halal", sort_order: 7 },
  { id: 8, name: "Kosher", sort_order: 8 },
];

// ── Fetch dietary options (falls back to the built-in list) ──
export async function fetchDietaryOptions(): Promise<DietaryOption[]> {
  if (DEMO) return FALLBACK_DIETARY_OPTIONS;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/dietary_options?select=*&order=sort_order`,
      { headers }
    );
    if (!res.ok) return FALLBACK_DIETARY_OPTIONS;
    const rows = (await res.json()) as DietaryOption[];
    return rows.length ? rows : FALLBACK_DIETARY_OPTIONS;
  } catch {
    return FALLBACK_DIETARY_OPTIONS;
  }
}

// ── Submit an RSVP ──
//  A single database call inserts the guest, their dietary options, their
//  plus-ones and each plus-one's dietary options together, so a half-saved
//  RSVP is not possible. Returns the new guest id.
export async function submitRSVP(data: {
  name: string;
  email: string;
  attending: boolean;
  dietary_option_ids: number[];
  dietary_other: string | null;
  song_request: string | null;
  /** The invitation code this RSVP came from, when they used their link. */
  invite_code?: string | null;
  plus_ones: {
    name: string;
    dietary_option_ids: number[];
    dietary_other: string | null;
    song_request: string | null;
  }[];
}): Promise<string> {
  return rpc<string>("submit_rsvp", {
    p_name: data.name,
    p_email: data.email,
    p_attending: data.attending,
    p_dietary_ids: data.dietary_option_ids,
    p_dietary_other: data.dietary_other,
    p_song: data.song_request,
    p_invite_code: data.invite_code ?? null,
    p_plus_ones: data.plus_ones
      .filter((p) => p.name.trim())
      .map((p) => ({
        name: p.name,
        dietary_option_ids: p.dietary_option_ids,
        dietary_other: p.dietary_other,
        song_request: p.song_request,
      })),
  });
}

// ── Admin: the guest list ──
export async function fetchGuests(): Promise<Guest[]> {
  return rpc<Guest[]>("admin_list_guests", { p_key: adminKey() });
}

export async function deleteGuest(id: string): Promise<void> {
  await rpc<void>("admin_delete_guest", { p_key: adminKey(), p_id: id });
}

export async function updateGuestStatus(id: string, status: GuestStatus): Promise<void> {
  await rpc<void>("admin_update_guest_status", { p_key: adminKey(), p_id: id, p_status: status });
}

export async function updateGuestNotes(id: string, notes: string): Promise<void> {
  await rpc<void>("admin_update_guest_notes", { p_key: adminKey(), p_id: id, p_notes: notes });
}

/** Seats one person (main guest or plus one). An empty table unseats them. */
export async function setTable(personId: string, table: string): Promise<void> {
  await rpc<void>("admin_set_table", { p_key: adminKey(), p_id: personId, p_table: table });
}

export async function clearAllGuests(): Promise<void> {
  await rpc<void>("admin_clear_guests", { p_key: adminKey() });
}
