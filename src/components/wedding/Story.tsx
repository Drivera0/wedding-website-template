import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { fadeUp } from "../../lib/animations";
import Image from "./Image";
import { useContent } from "../../lib/useContent";

const ease = [0.16, 1, 0.3, 1];

// On the teal background, cycle lemon / mist / cream (teal itself would vanish).
const YEAR_COLORS = ["#E9C46A", "#C9DCE6", "#F7F4EC"];

export default function Story() {
  const c = useContent();
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const photoY1 = useTransform(scrollYProgress, [0, 1], [15, -15]);
  const photoY2 = useTransform(scrollYProgress, [0, 1], [20, -10]);

  return (
    <section id="story" ref={sectionRef} className="bg-accent overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-[clamp(24px,5vw,80px)] py-section grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-20 items-center">
        {/* Text */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          <motion.p variants={fadeUp} custom={0} className="text-xs font-medium tracking-[4px] uppercase text-cream/80 mb-4">
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: "#C9DCE6" }} />
            {c("story.eyebrow")}
          </motion.p>

          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 1, ease, delay: 0.2 }}
            className="font-serif text-[clamp(40px,6vw,72px)] font-normal leading-[1.08] text-cream/95 mb-8"
          >
            {c("story.titleTop")}
            <br />
            <em className="italic">{c("story.titleAccent")}</em>
          </motion.h2>

          <motion.div variants={fadeUp} custom={2}>
            <p className="text-base font-light text-cream/85 leading-[1.9] mb-5 max-w-md">
              {c("story.body1")}
            </p>
            <p className="text-base font-light text-cream/85 leading-[1.9] max-w-md">
              {c("story.body2")}
            </p>
          </motion.div>

          {/* Timeline */}
          <motion.div variants={fadeUp} custom={3} className="flex gap-12 mt-12 flex-wrap">
            {[
              { year: c("story.t1.year"), label: c("story.t1.label") },
              { year: c("story.t2.year"), label: c("story.t2.label") },
              { year: c("story.t3.year"), label: c("story.t3.label") },
            ].map((t, i) => (
              <div key={i}>
                <p className="font-serif text-4xl font-normal leading-none" style={{ color: YEAR_COLORS[i % YEAR_COLORS.length] }}>{t.year}</p>
                <p className="text-[11px] tracking-[2px] uppercase text-cream/70 mt-2 font-normal">{t.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Photos */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            style={{ y: photoY1 }}
            initial={{ opacity: 0, scale: 1.03 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 1, ease }}
            className="aspect-[3/4] overflow-hidden"
          >
            <Image label="First Met" dark />
          </motion.div>

          <motion.div
            style={{ y: photoY2 }}
            initial={{ opacity: 0, scale: 1.03 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 1, ease, delay: 0.15 }}
            className="aspect-[3/4] overflow-hidden mt-12"
          >
            <Image label="Together" dark />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
