import { useState } from "react";
import { SITE_PASSWORD } from "../config";

const STORAGE_KEY = "wedding-auth";

/**
 * Is this browser allowed in?
 *
 * Two ways to qualify. The shared password unlocks for the session only.
 * A personalised invitation link unlocks persistently, so an invited guest can
 * come back to check the details weeks later without digging the email out
 * again, and reopening their link always works too.
 */
function readAuth(): string | null {
  try {
    return (
      sessionStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY)
    );
  } catch {
    return null;
  }
}

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  // Read synchronously during render, not in an effect. The gate now wraps each
  // route individually, so it remounts on every navigation; deciding this in an
  // effect would flash the password screen each time.
  const [authenticated, setAuthenticated] = useState(
    () => readAuth() === "true"
  );
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim().toUpperCase() === SITE_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      setAuthenticated(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 1500);
    }
  };

  if (authenticated) return <>{children}</>;

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
      <p className="text-[11px] tracking-[6px] uppercase text-accent font-normal mb-6">
        Alex &amp; Sam
      </p>
      <h1 className="font-serif text-[clamp(40px,7vw,72px)] font-normal text-ink leading-[1.05] mb-4 text-center">
        You're Invited
      </h1>
      <p className="text-[12px] tracking-[3px] uppercase text-ink-muted font-normal mb-10">
        Enter password to continue
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-5 w-full max-w-[300px]">
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Password"
          autoFocus
          className={`w-full bg-transparent border-b ${
            error ? "border-red-400" : "border-ink/15 focus:border-accent"
          } text-ink text-center text-[15px] tracking-[2px] py-3 transition-colors duration-300 placeholder:text-ink-faint`}
        />
        {error && (
          <p className="text-red-500 text-[12px] tracking-[1px]">
            Incorrect password
          </p>
        )}
        <button
          type="submit"
          className="text-[12px] font-medium tracking-[3px] uppercase text-cream bg-dark px-8 py-3.5 w-full transition-all duration-500 ease-out hover:bg-accent hover:-translate-y-px"
        >
          Enter
        </button>
      </form>
    </div>
  );
}
