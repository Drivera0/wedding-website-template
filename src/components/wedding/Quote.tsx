import { useScrollReveal } from "../../lib/gsap";
import Ornament from "./Ornament";

export default function Quote() {
  const ref = useScrollReveal({ children: true, y: 14, duration: 0.9, stagger: 0.12 });

  return (
    <section className="py-section px-[clamp(24px,5vw,80px)] bg-cream">
      <div
        ref={ref}
        className="max-w-3xl mx-auto text-center"
      >
        <Ornament className="text-accent mb-10" />

        <p
          className="font-serif text-[clamp(26px,4vw,48px)] font-normal italic leading-[1.45] text-ink"
        >
          "If you live to be a hundred, I want to live to be a hundred minus one
          day so I never have to live without you."
        </p>

        <p
          className="text-[13px] tracking-[3px] uppercase text-ink/70 font-normal mt-8"
        >
          A.A. Milne · <span className="italic tracking-[2px]">Winnie-the-Pooh</span>
        </p>
      </div>
    </section>
  );
}
