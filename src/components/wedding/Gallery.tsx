import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { fadeUp } from "../../lib/animations";
import Image from "./Image";

const ease = [0.16, 1, 0.3, 1];

const defaultBands = [
  { label: "Band One", caption: "Lorem ipsum dolor sit amet" },
  { label: "Band Two", caption: "Consectetur adipiscing elit" },
  { label: "Band Three", caption: "Sed do eiusmod tempor" },
];

/** A full-width image that gently parallaxes as you scroll past it: Giona-style. */
function Band({ label, caption }: { label: string; caption: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-7%", "7%"]);

  return (
    <div ref={ref} className="relative w-full h-[62vh] md:h-[86vh] overflow-hidden">
      {/* Oversized so the parallax shift never reveals an edge */}
      <motion.div style={{ y }} className="absolute -inset-x-0 -inset-y-[12%]">
        <Image label={label} priority />
      </motion.div>

      {/* Legibility scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#10222F]/55 via-transparent to-[#10222F]/10" />

      {/* Caption */}
      <div className="absolute inset-x-0 bottom-0 px-[clamp(24px,5vw,80px)] pb-10 md:pb-14">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1, ease }}
          className="font-serif italic text-cream text-[clamp(24px,4vw,46px)] leading-tight [text-shadow:0_2px_20px_rgba(20,41,58,0.4)]"
        >
          {caption}
        </motion.p>
      </div>
    </div>
  );
}

export default function Gallery() {
  const bands = defaultBands;
  return (
    <section id="gallery" className="bg-dark">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="px-[clamp(24px,5vw,80px)] pt-section pb-14 text-center"
      >
        <motion.p variants={fadeUp} custom={0} className="text-[11px] font-medium tracking-[4px] uppercase text-accent mb-4">
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: "#E9C46A" }} />
          Moments
        </motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="font-serif text-[clamp(40px,6vw,72px)] font-normal leading-[1.08] text-cream/95">
          A Glimpse of the Lake
        </motion.h2>
      </motion.div>

      {/* Full-width parallax bands */}
      <div className="flex flex-col">
        {bands.map((b) => (
          <Band key={b.label} label={b.label} caption={b.caption} />
        ))}
      </div>

      <div className="h-[clamp(80px,12vw,140px)]" />
    </section>
  );
}
