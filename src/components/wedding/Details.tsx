import { useScrollReveal } from "../../lib/gsap";
import { useContent } from "../../lib/useContent";
import { ACCENTS } from "../../data/palette";

const KEYS = ["ceremony", "reception", "dinner", "party"] as const;

export default function Details() {
  const c = useContent();
  const headerRef = useScrollReveal({ y: 24 });
  const cardsRef = useScrollReveal({ children: true, y: 24, stagger: 0.08, delay: 0.1 });

  const cards = KEYS.map((k) => ({
    label: c(`details.${k}.label`),
    time: c(`details.${k}.time`),
    place: c(`details.${k}.place`),
    note: c(`details.${k}.note`),
  }));

  return (
    <section id="details" className="py-section px-[clamp(24px,5vw,80px)] bg-cream">
      <div className="max-w-[1200px] mx-auto">
        <div ref={headerRef} className="text-center mb-16">
          <p className="text-xs font-medium tracking-[4px] uppercase text-accent mb-4">
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: "#6F8F6A" }} />
            {c("details.eyebrow")}
          </p>
          <h2 className="font-serif text-[clamp(40px,6vw,72px)] font-normal leading-[1.08] text-ink">{c("details.title")}</h2>
        </div>

        <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {cards.map((card, i) => (
            <div
              key={i}
              style={{ borderTop: `3px solid ${ACCENTS[i % ACCENTS.length]}` }}
              className="group relative border border-sand p-10 md:p-12 text-center bg-cream transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(31,47,59,0.08)]"
            >
              <span className="block w-2.5 h-2.5 rounded-full mx-auto mb-4" style={{ background: ACCENTS[i % ACCENTS.length] }} />
              <p className="text-[11px] tracking-[3px] uppercase text-accent font-medium mb-6">{card.label}</p>
              <p className="font-serif text-3xl font-medium text-ink mb-4">{card.time}</p>
              <p className="text-accent/30 text-sm mx-auto mb-4">·&nbsp;&nbsp;·&nbsp;&nbsp;·</p>
              <p className="text-[15px] text-ink-soft font-normal mb-1">{card.place}</p>
              <p className="text-[13px] text-ink-muted font-light">{card.note}</p>
            </div>
          ))}
        </div>

        {/* Dress code: below the boxes, not a box */}
        <div className="text-center mt-16 max-w-2xl mx-auto">
          <p className="text-[clamp(17px,2.1vw,22px)] font-medium tracking-[3px] uppercase text-accent mb-4">{c("details.dresscode.label")}</p>
          <p className="text-[15px] md:text-[16px] text-ink-soft font-light leading-[1.8]">{c("details.dresscode.text")}</p>
        </div>
      </div>
    </section>
  );
}
