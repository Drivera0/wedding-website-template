import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  scrollTo,
  scrollToY,
  takeRememberedScroll,
  hasRememberedScroll,
  resolveAnchor,
} from "../lib/scroll";
import Navbar from "../components/wedding/Navbar";
import Cover from "../components/wedding/Cover";
import Story from "../components/wedding/Story";
import Quote from "../components/wedding/Quote";
import Gallery from "../components/wedding/Gallery";
import Details from "../components/wedding/Details";
import Venue from "../components/wedding/Venue";
import Travel from "../components/wedding/Travel";
import Discover from "../components/wedding/Discover";
import FAQ from "../components/wedding/FAQ";
import Closing from "../components/wedding/Closing";
import Footer from "../components/wedding/Footer";
import RSVP from "../components/wedding/RSVP";

export default function Wedding() {
  const [rsvpOpen, setRsvpOpen] = useState(false);

  const openRSVP = () => setRsvpOpen(true);
  const closeRSVP = () => setRsvpOpen(false);

  // Set once we've restored a saved offset, so the hash handler stays out of it.
  const restoredRef = useRef(false);

  // Hides the page only while the scroll position is wrong. Seeded from storage
  // so the very first paint is already hidden when a restore is pending.
  const [restoring, setRestoring] = useState(() => hasRememberedScroll());

  const { hash } = useLocation();

  // Coming back from a city page, land exactly where you left off.
  //
  // The one thing that made this hard: on the very first frame the document is
  // still short, so scrolling to the saved position gets clamped and you end up
  // near the top. So wait for the page to actually be tall enough, which takes
  // about one frame, then jump once. No overlay and no animation: an overlay
  // long enough to cover the reflow reads as a stall, then a lurch.
  useLayoutEffect(() => {
    const anchor = takeRememberedScroll();
    if (!anchor) return;
    restoredRef.current = true;

    // Stop the browser doing its own restore and fighting us.
    const prevRestoration = history.scrollRestoration;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    // Re-apply the position every frame until we are genuinely sitting on it,
    // because the document starts short (the jump gets clamped) and Lenis
    // resets the position when it initialises. Then stop touching it.
    //
    // The page is hidden only while it is actually in the wrong place, and is
    // revealed the moment it is right. Holding a cover for a fixed stretch
    // regardless is what made this feel like a stall followed by a lurch.
    const CAP_MS = 1200;
    const started = Date.now();
    let onTargetFrames = 0;
    let raf = 0;

    const tick = () => {
      const target = resolveAnchor(anchor);
      const off = Math.abs(window.scrollY - target);

      if (off > 1) {
        scrollToY(target);
        onTargetFrames = 0;
      } else {
        onTargetFrames += 1;
      }

      // Three consecutive frames in the right place means the layout has
      // stopped moving under us. Reveal and stop.
      if (onTargetFrames >= 3 || Date.now() - started > CAP_MS) {
        setRestoring(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      if ("scrollRestoration" in history) history.scrollRestoration = prevRestoration;
    };
  }, []);

  // Arriving with a hash from somewhere else (a shared /#travel link, say).
  // Skipped entirely when we've just restored a remembered position.
  useEffect(() => {
    if (restoredRef.current || !hash) return;
    const id = setTimeout(() => scrollTo(hash), 150);
    return () => clearTimeout(id);
  }, [hash]);

  return (
    <>
      {restoring && (
        <div
          aria-hidden
          className="fixed inset-0 z-[400] bg-cream"
          style={{ pointerEvents: "none" }}
        />
      )}
      <Navbar onRSVP={openRSVP} />
      <main>
        <Cover onRSVP={openRSVP} />
        <Story />
        <Quote />
        <Gallery />
        <Details />
        <Venue />
        <Travel />
        <Discover />
        <FAQ />
        <Closing onRSVP={openRSVP} />
      </main>
      <Footer />
      <RSVP open={rsvpOpen} onClose={closeRSVP} />
    </>
  );
}
