import { useScrollReveal } from "../../lib/gsap";

type Block = {
  title: string;
  paragraphs: string[];
  links?: { label: string; href: string }[];
};

// ── Where to stay ──────────────────────────────────────────────
const stay: Block[] = [
  {
    title: "Where to Stay",
    paragraphs: [
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    ],
  },
  {
    title: "Getting Around",
    paragraphs: [
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
      "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    ],
  },
];

// ── Arriving ───────────────────────────────────────────────────
const arriving: Block[] = [
  {
    title: "From the Airport",
    paragraphs: [
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    ],
  },
  {
    title: "Trains",
    paragraphs: [
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    ],
  },
  {
    title: "While You're Here",
    paragraphs: [
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
      "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    ],
  },
];

function Card({ item }: { item: Block }) {
  return (
    <div className="p-10 md:p-12 bg-cream transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(20,41,58,0.18)]">
      <p className="text-[11px] tracking-[3px] uppercase text-accent font-medium mb-4">
        {item.title}
      </p>
      <div className="space-y-4">
        {item.paragraphs.map((p, i) => (
          <p key={i} className="text-[15px] leading-[1.85] text-ink-soft font-light">
            {p}
          </p>
        ))}
      </div>
      {item.links && (
        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-6">
          {item.links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium tracking-[2px] uppercase text-accent hover:text-accent-hover underline underline-offset-4 transition-colors duration-300"
            >
              {l.label} →
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Travel() {
  const headerRef = useScrollReveal({ y: 24 });
  const stayRef = useScrollReveal({ children: true, y: 24, stagger: 0.1, delay: 0.1 });
  const arrivingHeaderRef = useScrollReveal({ y: 24 });
  const arrivingRef = useScrollReveal({ children: true, y: 24, stagger: 0.1, delay: 0.1 });

  return (
    <section id="travel" className="bg-cypress py-section px-[clamp(24px,5vw,80px)]">
      <div className="max-w-[1200px] mx-auto">
        <div ref={headerRef} className="text-center mb-14">
          <p className="text-xs font-medium tracking-[4px] uppercase text-cream/90 mb-4">
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: "#E9C46A" }} />
            Getting There
          </p>
          <h2 className="font-serif text-[clamp(36px,5vw,60px)] font-normal leading-[1.1] text-cream">Travel &amp; Stay</h2>
        </div>

        <div ref={stayRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stay.map((item) => (
            <Card key={item.title} item={item} />
          ))}
        </div>

        {/* ── Arriving ── */}
        <div ref={arrivingHeaderRef} className="text-center mt-24 mb-14">
          <p className="text-xs font-medium tracking-[4px] uppercase text-cream/90 mb-4">
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: "#C9DCE6" }} />
            Coming From Afar
          </p>
          <h2 className="font-serif text-[clamp(36px,5vw,60px)] font-normal leading-[1.1] text-cream">
            Arriving in Italy
          </h2>
        </div>

        <div ref={arrivingRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {arriving.map((item) => (
            <Card key={item.title} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
