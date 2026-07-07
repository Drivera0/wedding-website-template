import { motion } from "framer-motion";
import Image from "./Image";
import Ornament from "./Ornament";
import { WEDDING } from "../../config";

const ease = [0.16, 1, 0.3, 1];

export default function Cover({ onRSVP }: { onRSVP: () => void }) {
  return (
    <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">
      {/* Full-bleed painting */}
      <motion.div
        initial={{ scale: 1.06, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2, ease }}
        className="absolute inset-0"
      >
        <Image label="Hero Photo" className="absolute inset-0 h-full w-full" priority />
      </motion.div>

      {/* Blue scrim for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#14293A]/60 via-[#14293A]/30 to-[#14293A]/78" />
      <div className="absolute inset-0 bg-[#14293A]/12" />

      {/* Thin inset frame: a Giona-style ornamental touch */}
      <div className="pointer-events-none absolute inset-[14px] md:inset-6 border border-cream/25" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 0.5 }}
          className="text-[11px] md:text-[12px] font-normal tracking-[6px] uppercase text-cream/80 mb-7"
        >
          Welcome · {WEDDING.country}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.1, ease, delay: 0.7 }}
          className="font-script text-cream leading-[0.9] [text-shadow:0_2px_24px_rgba(20,41,58,0.35)]"
        >
          <span className="block text-[clamp(76px,14vw,196px)]">{WEDDING.coupleFirst}</span>
          <span className="block font-serif italic font-light text-cream/80 text-[clamp(20px,2.6vw,32px)] my-2 md:my-3">
            and
          </span>
          <span className="block text-[clamp(76px,14vw,196px)]">{WEDDING.coupleSecond}</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 1.0 }}
          className="mt-7 flex flex-col items-center gap-4"
        >
          <Ornament className="text-cream/75" />
          <p className="text-[11px] md:text-[12px] font-normal tracking-[3px] uppercase text-cream/85">
            {WEDDING.dateShort} · {WEDDING.venueCity}
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 1.2 }}
          onClick={onRSVP}
          className="group mt-11 inline-flex items-center gap-3 bg-teal text-cream px-10 py-4 text-[12px] font-medium tracking-[3px] uppercase transition-all duration-500 ease-out hover:bg-accent-hover hover:-translate-y-0.5"
        >
          <span>RSVP</span>
          <svg className="w-4 h-4 transition-transform duration-500 ease-out group-hover:translate-x-1"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </motion.button>
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 1 }}
        className="absolute bottom-9 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] tracking-[3px] uppercase text-cream/60 font-light">Scroll</span>
        <motion.svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor"
          strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-cream/50"
          animate={{ y: [0, 3, 0] }} transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity }}>
          <path d="M3 5.5L8 10.5L13 5.5" />
        </motion.svg>
      </motion.div>
    </section>
  );
}
