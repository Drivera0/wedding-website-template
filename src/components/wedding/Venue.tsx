import { useEffect, useState } from "react";
import { useScrollReveal } from "../../lib/gsap";
import { useContent } from "../../lib/useContent";
import { WEDDING } from "../../config";
import { googleEmbedUrl, googleLinkUrl, osmEmbedUrl } from "../../lib/maps";

// If Google's frame hasn't reported back by now, assume something is
// blocking it and offer the fallback instead of a blank rectangle.
const LOAD_TIMEOUT_MS = 7000;

export default function Venue() {
  const c = useContent();
  const headerRef = useScrollReveal({ y: 24 });
  const bodyRef = useScrollReveal({ children: true, y: 24, stagger: 0.12, delay: 0.1 });

  const venueName = c("venue.name") || WEDDING.venueName;
  const venueCity = c("venue.city") || WEDDING.venueCity;

  // Saved admin value wins, config default is the offline fallback.
  const query = c("venue.query") || WEDDING.venueQuery;

  const embedUrl = googleEmbedUrl(query, WEDDING.venueLat, WEDDING.venueLng);
  const linkUrl = googleLinkUrl(query);
  const fallbackUrl = osmEmbedUrl(WEDDING.venueLat, WEDDING.venueLng);

  const [status, setStatus] = useState<"loading" | "ok" | "failed">("loading");
  const [useFallback, setUseFallback] = useState(false);

  // Re-arm whenever the address changes so a new address never inherits the
  // previous render's verdict.
  useEffect(() => {
    setStatus("loading");
    setUseFallback(false);
    const t = setTimeout(
      () => setStatus((s) => (s === "loading" ? "failed" : s)),
      LOAD_TIMEOUT_MS
    );
    return () => clearTimeout(t);
  }, [embedUrl]);

  const showingFallback = Boolean(fallbackUrl) && (useFallback || status === "failed");

  return (
    <section id="venue" className="py-section px-[clamp(24px,5vw,80px)] bg-lemon">
      <div className="max-w-[1100px] mx-auto">
        <div ref={headerRef} className="text-center mb-14">
          <p className="text-[11px] font-medium tracking-[4px] uppercase text-ink/75 mb-4">
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: "#6F8F6A" }} />
            {c("venue.eyebrow")}
          </p>
          <h2 className="font-serif text-[clamp(40px,6vw,72px)] font-normal leading-[1.05] text-ink">
            {c("venue.title")}
          </h2>
        </div>

        <div ref={bodyRef} className="flex flex-col items-center">
          <p className="font-serif italic text-[clamp(24px,3vw,34px)] text-ink leading-snug mb-2 text-center">
            {venueName}
          </p>
          <p className="text-[13px] tracking-[2px] uppercase text-ink/70 mb-3 text-center">
            {venueCity}
          </p>

          {/* The address as plain text, always. Whatever happens to the
              iframe, nobody should leave this page without it. */}
          <p className="text-[14px] text-ink/80 font-light mb-10 text-center max-w-md">
            {query}
          </p>

          {/* Embedded map */}
          <div className="w-full border border-ink/20 overflow-hidden shadow-[0_20px_60px_rgba(20,41,58,0.15)]">
            {showingFallback && fallbackUrl ? (
              <iframe
                key={fallbackUrl}
                title={`Map to ${venueName}`}
                src={fallbackUrl}
                className="w-full h-[340px] md:h-[440px]"
                style={{ border: 0 }}
                loading="lazy"
              />
            ) : (
              <iframe
                // Keyed on the URL so a changed address remounts the frame
                // rather than reusing the previously cached one.
                key={embedUrl}
                title={`Map to ${venueName}`}
                src={embedUrl}
                className="w-full h-[340px] md:h-[440px]"
                style={{ border: 0, filter: "saturate(0.9) contrast(0.98)" }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                onLoad={() => setStatus("ok")}
              />
            )}
          </div>

          {/* Escape hatch. Google's embed is blocked by some ad blockers and
              privacy settings, so give people a way out that always works. */}
          {fallbackUrl && !showingFallback && (
            <button
              type="button"
              onClick={() => setUseFallback(true)}
              className="mt-4 text-[11px] tracking-[1.5px] uppercase text-ink/55 underline underline-offset-4 hover:text-ink transition-colors duration-300"
            >
              Map not loading? Use the simple map
            </button>
          )}
          {showingFallback && (
            <p className="mt-4 text-[11px] tracking-[1.5px] uppercase text-ink/55">
              Showing the standard map. The address is above
            </p>
          )}

          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-10 inline-flex items-center gap-3 bg-dark text-cream px-10 py-4 text-[12px] font-medium tracking-[3px] uppercase transition-all duration-500 ease-out hover:bg-accent hover:-translate-y-0.5"
          >
            <span>Open in Google Maps</span>
            <svg className="w-4 h-4 transition-transform duration-500 ease-out group-hover:translate-x-1"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
