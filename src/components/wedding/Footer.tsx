import { Link } from "react-router-dom";
import { useScrollReveal } from "../../lib/gsap";
import Ornament from "./Ornament";
import { WEDDING } from "../../config";

export default function Footer() {
  const ref = useScrollReveal({ children: true, y: 0, duration: 0.8, stagger: 0.1, start: "top 95%" });

  return (
    <footer className="bg-darker border-t border-cream/[0.04] py-16 px-[clamp(24px,5vw,80px)]">
      <div
        ref={ref}
        className="text-center"
      >
        <Ornament className="text-lemon/50 mb-6" />
        <p className="font-script text-[42px] leading-tight text-cream/90 mb-2">
          {WEDDING.coupleFirst} &amp; {WEDDING.coupleSecond}
        </p>
        <p className="text-[13px] tracking-[3px] uppercase text-cream/50 font-light">
          {WEDDING.dateShort} · {WEDDING.country}
        </p>
        <Link
          to="/admin"
          className="inline-block mt-8 text-[11px] font-medium tracking-[2px] uppercase text-cream/70 border border-cream/15 px-6 py-2.5 rounded transition-all duration-300 hover:bg-accent hover:text-cream hover:border-accent hover:-translate-y-px"
        >
          Admin
        </Link>
      </div>
    </footer>
  );
}
