import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase";
import { DEMO, demoRpc } from "./demo";

// ============================================================
//  ADMIN AUTH
// ============================================================
//  The admin password is NOT in this bundle. It is typed in at the login
//  screen, verified by the database, and held in sessionStorage for the rest
//  of the tab's life so the dashboard can pass it with each privileged call.
//
//  Every admin database function checks it server-side and pauses for half a
//  second on a wrong answer, which makes guessing it over the network
//  impractical. Nothing in the shipped JavaScript reveals it.
// ============================================================

export { setAdminKey, adminKey, clearAdminKey, hasAdminKey } from "./adminKey";

/** Ask the database whether this password is right. */
export async function checkAdminKey(key: string): Promise<boolean> {
  if (DEMO) return demoRpc<boolean>("admin_check_key", { p_key: key });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_check_key`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ p_key: key }),
  });
  if (res.ok) return (await res.json()) === true;
  return false; // a wrong key raises, which arrives here as a non-2xx
}
