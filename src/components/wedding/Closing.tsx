import { useScrollReveal } from "../../lib/gsap";
import Countdown from "./Countdown";
import { WEDDING } from "../../config";

export default function Closing({ onRSVP }: { onRSVP: () => void }) {
  const ref = useScrollReveal({ children: true, y: 24, stagger: 0.1 });

  return (
    <section className="bg-dark py-section px-[clamp(24px,5vw,80px)]">
      <div
        ref={ref}
        className="max-w-2xl mx-auto text-center"
      >
        <p className="text-xs font-medium tracking-[4px] uppercase text-accent mb-6">
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: "#6F8F6A" }} />
          Join Us
        </p>

        <h2
          className="font-serif text-[clamp(36px,5vw,64px)] font-normal leading-[1.1] text-cream/95 mb-4">
          We can't wait to
          <br />
          <em className="italic">celebrate with you</em>
        </h2>

        <div className="my-10 md:my-12">
          <Countdown />
        </div>

        <p className="text-base text-cream/60 font-light mb-12 leading-relaxed">
          {WEDDING.dateShort}<br />{WEDDING.country}
        </p>

        <div>
          <button
            onClick={onRSVP}
            className="group inline-flex items-center gap-3 bg-accent text-cream px-12 py-5 text-[13px] font-medium tracking-[3px] uppercase transition-all duration-500 ease-out hover:bg-accent-hover hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(46,125,143,0.28)]"
          >
            <span>RSVP Now</span>
            <svg className="w-4 h-4 transition-transform duration-500 ease-out group-hover:translate-x-1"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
