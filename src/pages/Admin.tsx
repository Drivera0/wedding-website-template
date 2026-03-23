import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DEMO, DEMO_ADMIN_PASSWORD } from "../lib/demo";
import { checkAdminKey, setAdminKey, clearAdminKey, hasAdminKey } from "../lib/adminAuth";
import InvitationsTab from "../components/admin/InvitationsTab";
import GuestListTab from "../components/admin/GuestListTab";
import SummaryTab from "../components/admin/SummaryTab";

type Tab = "guests" | "invitations" | "summary";

const TAB_LABEL: Record<Tab, string> = {
  guests: "Guest list",
  invitations: "Invitations",
  summary: "Summary",
};

export default function Admin() {
  // Stay signed in for the tab, so a refresh does not log you out.
  const [authenticated, setAuthenticated] = useState(() => hasAdminKey());
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);
  const [checking, setChecking] = useState(false);
  const [tab, setTab] = useState<Tab>("guests");

  // Override body background for admin pages
  useEffect(() => {
    document.body.style.background = "#0a0a0a";
    return () => { document.body.style.background = ""; };
  }, []);

  // The password is checked by the database, not compared here. Nothing in the
  // shipped JavaScript contains it, and a wrong answer costs the caller half a
  // second server-side, so it cannot be brute-forced over the network.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setPwError(false);
    const ok = await checkAdminKey(password);
    if (ok) {
      setAdminKey(password);
      setAuthenticated(true);
      setPassword("");
    } else {
      setPwError(true);
    }
    setChecking(false);
  };

  const signOut = () => {
    clearAdminKey();
    setAuthenticated(false);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-admin flex items-center justify-center px-4 [color-scheme:dark]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl text-cream mb-2">Admin</h1>
            <p className="text-sm text-white/60 font-light">Enter your password to continue</p>
            {DEMO && (
              <p className="text-xs text-accent mt-3">
                Demo mode: the password is <strong className="font-semibold">{DEMO_ADMIN_PASSWORD}</strong>
              </p>
            )}
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPwError(false); }}
              placeholder="Password"
              disabled={checking}
              className="w-full py-3.5 px-4 bg-white/[0.04] border border-white/[0.06] text-cream text-sm font-light placeholder:text-white/55 focus:border-accent/40 transition-colors duration-300 outline-none rounded-sm"
              autoFocus
            />
            {pwError && <p className="text-rose text-xs text-center">Incorrect password</p>}
            <button type="submit" disabled={checking || !password} className="w-full py-3.5 bg-accent text-cream text-[12px] font-semibold tracking-[3px] uppercase hover:bg-accent-hover transition-colors duration-300 rounded-sm disabled:opacity-40">
              {checking ? "Checking..." : "Sign In"}
            </button>
          </form>
          <p className="text-center mt-6">
            <a href="/" className="text-xs text-white/55 hover:text-accent transition-colors duration-300">&larr; Back to site</a>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-admin text-cream [color-scheme:dark]">
      <header className="border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex flex-wrap gap-x-6 gap-y-3 items-center justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 min-w-0">
            <h1 className="font-serif text-xl">Dashboard</h1>
            <nav className="flex gap-1 overflow-x-auto">
              {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 sm:px-4 py-1.5 text-[11px] tracking-[2px] uppercase whitespace-nowrap transition-all duration-300 rounded-sm ${
                    tab === t ? "bg-white/[0.06] text-cream" : "text-white/60 hover:text-white/80"
                  }`}
                >
                  {TAB_LABEL[t]}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-5">
            <a href="/" className="text-[11px] tracking-[2px] uppercase text-white/60 hover:text-white/80 transition-colors duration-300">View Site</a>
            <button onClick={signOut} className="text-[11px] tracking-[2px] uppercase text-white/45 hover:text-rose transition-colors duration-300">Sign Out</button>
          </div>
        </div>
      </header>
      {tab === "guests" ? <GuestListTab /> : tab === "invitations" ? <InvitationsTab /> : <SummaryTab />}
    </div>
  );
}
