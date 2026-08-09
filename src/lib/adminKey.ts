// The admin password, as typed at the login screen. Deliberately in its own
// module with no imports, so both supabase.ts and adminAuth.ts can use it
// without a circular dependency. It is never bundled: only ever what the user
// typed this session.

const KEY = "wedding-admin-key";

export function setAdminKey(key: string) {
  try { sessionStorage.setItem(KEY, key); } catch { /* ignore */ }
}

export function adminKey(): string {
  try { return sessionStorage.getItem(KEY) ?? ""; } catch { return ""; }
}

export function clearAdminKey() {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function hasAdminKey() {
  return adminKey().length > 0;
}
