import { Link } from "react-router-dom";
import { useScrollReveal } from "../../lib/gsap";
import { rememberScroll } from "../../lib/scroll";
import Ornament from "./Ornament";
import { CITIES } from "../../data/cities";

export default function Discover() {
  const headerRef = useScrollReveal({ y: 24 });
  const cardsRef = useScrollReveal({ children: true, y: 24, stagger: 0.1, delay: 0.1 });

  return (
    <section id="discover" className="py-section px-[clamp(24px,5vw,80px)] bg-cream">
      <div className="max-w-[1200px] mx-auto">
        <div ref={headerRef} className="text-center mb-16">
          <p className="text-[11px] font-medium tracking-[4px] uppercase text-accent mb-4">While You're Here</p>
          <h2 className="font-serif text-[clamp(40px,6vw,72px)] font-normal leading-[1.05] text-ink mb-5">
            Discover the Area
          </h2>
          <Ornament className="text-accent/70 mb-5" />
          <p className="text-[15px] md:text-base text-ink-soft font-light leading-relaxed max-w-xl mx-auto">
            Make a trip of it. A few of our favourite places, all within easy reach of the celebration.
            Tap a city to explore our must-sees.
          </p>
        </div>

        <div className="max-w-2xl mx-auto mb-16 space-y-5 text-[15px] md:text-base text-ink-soft font-light leading-[1.9]">
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
          <p>
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </p>
        </div>

        <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {CITIES.map((c) => (
            <Link
              key={c.slug}
              to={`/discover/${c.slug}`}
              // Remember where we are so coming back lands on this card, not
              // the top of the page. Works for the back link and the browser
              // back button alike.
              onClick={rememberScroll}
              style={{ borderTop: `3px solid ${c.color}` }}
              className="group relative block border border-sand p-10 md:p-12 bg-cream transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(31,47,59,0.08)]"
            >
              <p className="flex items-center gap-2 text-[11px] tracking-[3px] uppercase text-accent font-medium mb-3">
                <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                {c.subtitle}
              </p>
              <h3 className="font-serif text-3xl md:text-4xl font-normal text-ink mb-4">{c.name}</h3>
              <p className="text-[15px] text-ink-soft font-light leading-[1.85] mb-6">{c.blurb}</p>
              <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[2px] uppercase text-ink/50 group-hover:text-accent transition-colors duration-300">
                Explore
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
