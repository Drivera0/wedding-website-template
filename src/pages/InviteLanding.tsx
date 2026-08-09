import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { resolveInvitation, storeInvite } from "../lib/invitations";
import { WEDDING } from "../config";

/**
 * The landing page for a personalised invitation link, /i/<code>.
 *
 * This route sits OUTSIDE the password gate on purpose: a valid code is the
 * login. We resolve it, remember it for the session, and drop the guest onto
 * the site with their RSVP already knowing who they are.
 */
export default function InviteLanding() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<"checking" | "invalid">("checking");

  useEffect(() => {
    let active = true;
    (async () => {
      if (!code) return setState("invalid");
      try {
        const invite = await resolveInvitation(code);
        if (!active) return;
        if (!invite) return setState("invalid");
        storeInvite(invite);
        // replace, so Back doesn't bounce them through here again
        navigate("/", { replace: true });
      } catch {
        if (active) setState("invalid");
      }
    })();
    return () => {
      active = false;
    };
  }, [code, navigate]);

  if (state === "checking") {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <p className="text-[11px] tracking-[6px] uppercase text-accent mb-6">
          {WEDDING.coupleFirst} &amp; {WEDDING.coupleSecond}
        </p>
        <h1 className="font-serif text-[clamp(32px,5vw,52px)] font-normal text-ink leading-tight">
          Opening your invitation
        </h1>
        <div className="mt-8 h-px w-16 bg-accent/40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
      <p className="text-[11px] tracking-[6px] uppercase text-accent mb-6">
        {WEDDING.coupleFirst} &amp; {WEDDING.coupleSecond}
      </p>
      <h1 className="font-serif text-[clamp(32px,5vw,52px)] font-normal text-ink leading-tight mb-4">
        We couldn't find that invitation
      </h1>
      <p className="text-[15px] text-ink-soft font-light leading-relaxed max-w-md mb-8">
        The link may have been cut short by your email app. Try tapping it again
        from the original message, or copy the whole address into your browser.
        If it still doesn't work, just let us know and we'll send you a new one.
      </p>
      <Link
        to="/"
        className="text-[12px] font-medium tracking-[2px] uppercase text-cream bg-dark px-8 py-3.5 transition-all duration-500 ease-out hover:bg-accent hover:-translate-y-px"
      >
        Go to the site
      </Link>
    </div>
  );
}
