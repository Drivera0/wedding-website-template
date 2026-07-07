import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useScrollReveal } from "../../lib/gsap";

// On the mist background, cycle the deeper accents (mist and lemon would vanish).
const TOGGLE_COLORS = ["#2E7D8F", "#1E3A4C", "#6F8F6A"];

const faqs: { q: string; a: ReactNode }[] = [
  {
    q: "How do I RSVP?",
    a: "Tap the RSVP button, enter the invitation code printed on your invite, and let us know if you can make it, plus any dietary needs and the song you'd most like to hear. If your invitation includes a +1, you'll be able to add your guest there.",
  },
  {
    q: "When should I respond by?",
    a: (
      <>
        Please RSVP by <strong className="font-medium text-ink">1 March 2027</strong> so we can
        finalise numbers with the venue. Earlier is always welcome, and if
        anything changes after you've responded, just let us know.
      </>
    ),
  },
  {
    q: "Can I bring a guest?",
    a: "Your invitation code tells the form whether you may bring a +1. If it does, you'll see the option to add a guest; if not, the invitation is reserved just for you.",
  },
  {
    q: "What should I wear?",
    a: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  },
  {
    q: "Where should I stay?",
    a: "Como is your best bet, since it's close to the venue and there's a wide range of options. Have a look at the Travel & Stay section for our actual recommendations, the neighbourhoods we'd point you to, and how to get around.",
  },
  {
    q: "How do I get there?",
    a: "Most people will fly into Milan. There's a full rundown in the Travel & Stay section: trains, buses, and what to do with the rest of your trip while you're here.",
  },
  {
    q: "Will there be parking?",
    a: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const headerRef = useScrollReveal({ y: 24 });

  return (
    <section id="faq" className="py-section px-[clamp(24px,5vw,80px)] bg-mist">
      <div className="max-w-3xl mx-auto">
        <div ref={headerRef} className="text-center mb-14">
          <p className="text-[11px] font-medium tracking-[4px] uppercase text-ink/75 mb-4">
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: "#6F8F6A" }} />
            Good to Know
          </p>
          <h2 className="font-serif text-[clamp(40px,6vw,72px)] font-normal leading-[1.05] text-ink">
            Questions &amp; Answers
          </h2>
        </div>

        <div className="border-t border-ink/15">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="border-b border-ink/15">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-6 py-6 text-left group"
                >
                  <span className="font-serif text-[clamp(19px,2.4vw,26px)] text-ink group-hover:text-teal transition-colors duration-300">
                    {f.q}
                  </span>
                  <span
                    className={`text-2xl leading-none shrink-0 transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}
                    style={{ color: TOGGLE_COLORS[i % TOGGLE_COLORS.length] }}
                  >
                    +
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="text-[15px] md:text-base text-ink/75 font-light leading-[1.85] pb-6 max-w-2xl">
                        {f.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
