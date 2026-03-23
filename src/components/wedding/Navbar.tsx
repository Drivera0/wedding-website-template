import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WEDDING } from "../../config";
import { stopScroll, startScroll, scrollTo } from "../../lib/scroll";

const ease = [0.16, 1, 0.3, 1];

const links = [
  { label: "Story", href: "#story" },
  { label: "Details", href: "#details" },
  { label: "Venue", href: "#venue" },
  { label: "Travel", href: "#travel" },
  { label: "Discover", href: "#discover" },
  { label: "FAQ", href: "#faq" },
];

const SECTION_IDS = ["faq", "discover", "travel", "venue", "details", "gallery", "story"];

export default function Navbar({ onRSVP }: { onRSVP: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const rafId = useRef(0);
  const lastScrolled = useRef(false);
  const lastActive = useRef("");

  const handleScroll = useCallback(() => {
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = 0;
      const isScrolled = window.scrollY > 80;
      if (isScrolled !== lastScrolled.current) {
        lastScrolled.current = isScrolled;
        setScrolled(isScrolled);
      }

      let found = "";
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200 && rect.bottom > 200) {
            found = id;
            break;
          }
        }
      }
      if (found !== lastActive.current) {
        lastActive.current = found;
        setActiveSection(found);
      }
    });
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [handleScroll]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      stopScroll();
    } else {
      document.body.style.overflow = "";
      startScroll();
    }
    return () => { document.body.style.overflow = ""; startScroll(); };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease, delay: 1.4 }}
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between transition-[padding,background-color,border-color] duration-500 ease-out ${
          scrolled
            ? "py-3 md:py-4 px-[var(--px)] bg-cream/90 backdrop-blur-xl border-b border-black/[0.03]"
            : "py-5 md:py-6 px-[var(--px)] bg-transparent border-b border-transparent"
        }`}
        style={{ "--px": "clamp(20px, 5vw, 80px)", willChange: "transform", transform: "translateZ(0)" } as React.CSSProperties}
      >
        <a href="#" className="font-serif text-lg font-medium italic text-ink transition-opacity duration-500 hover:opacity-60">
          {WEDDING.coupleFirst[0]} <span className="text-accent">&</span> {WEDDING.coupleSecond[0]}
        </a>

        <div className="hidden md:flex items-center gap-10">
          {links.map((link) => (
            <button
              key={link.label}
              onClick={() => scrollTo(link.href)}
              className={`relative text-[12px] font-normal tracking-[2px] uppercase transition-colors duration-500 group bg-transparent border-none cursor-pointer ${
                activeSection === link.href.slice(1) ? "text-ink" : "text-ink-muted hover:text-ink"
              }`}
            >
              {link.label}
              <span className={`absolute -bottom-1 left-0 h-px bg-accent transition-all duration-500 ease-out ${
                activeSection === link.href.slice(1) ? "w-full" : "w-0 group-hover:w-full"
              }`} />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onRSVP}
            className="text-[12px] font-medium tracking-[2px] uppercase text-cream bg-dark px-5 py-2 md:px-6 md:py-2.5 transition-all duration-500 ease-out hover:bg-accent"
          >
            RSVP
          </button>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex flex-col gap-[5px] w-6 p-0.5"
            aria-label="Menu"
          >
            <span className={`block h-px bg-ink transition-all duration-500 ease-out origin-center ${mobileOpen ? "rotate-45 translate-y-[3px]" : ""}`} />
            <span className={`block h-px bg-ink transition-all duration-500 ease-out ${mobileOpen ? "opacity-0 scale-x-0" : ""}`} />
            <span className={`block h-px bg-ink transition-all duration-500 ease-out origin-center ${mobileOpen ? "-rotate-45 -translate-y-[3px]" : ""}`} />
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease }}
            className="fixed inset-0 z-40 md:hidden"
          >
            <div className="absolute inset-0 bg-cream/95 backdrop-blur-2xl" />
            <div className="relative flex flex-col items-center justify-center h-full gap-8">
              {links.map((link, i) => (
                <motion.button
                  key={link.label}
                  onClick={() => { closeMobile(); setTimeout(() => scrollTo(link.href), 350); }}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.4, ease, delay: i * 0.06 }}
                  className="font-serif text-3xl font-normal text-ink hover:text-accent transition-colors duration-500"
                >
                  {link.label}
                </motion.button>
              ))}
              <motion.button
                onClick={() => { closeMobile(); onRSVP(); }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.4, ease, delay: 0.2 }}
                className="mt-4 text-[13px] font-medium tracking-[3px] uppercase text-cream bg-dark px-10 py-4 hover:bg-accent transition-colors duration-500"
              >
                RSVP
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
