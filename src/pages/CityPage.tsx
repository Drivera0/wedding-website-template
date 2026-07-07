import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import Ornament from "../components/wedding/Ornament";
import { cityBySlug } from "../data/cities";

export default function CityPage() {
  const { slug } = useParams();
  const city = cityBySlug(slug);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (!city) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-serif text-4xl text-ink mb-4">City not found</h1>
        <Link to="/" className="text-[12px] tracking-[2px] uppercase text-accent hover:text-accent-hover">
          ← Back to Discover the Area
        </Link>
      </div>
    );
  }

  return (
    <main className="bg-cream min-h-screen">
      {/* Signature colour band */}
      <div className="h-1.5 w-full" style={{ background: city.color }} />

      {/* Back link */}
      <div className="px-[clamp(24px,5vw,80px)] pt-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[2px] uppercase text-ink/50 hover:text-accent transition-colors duration-300"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Discover the Area
        </Link>
      </div>

      {/* Hero */}
      <section className="px-[clamp(24px,5vw,80px)] pt-16 pb-12 text-center max-w-3xl mx-auto">
        <p className="text-[11px] font-medium tracking-[5px] uppercase text-accent mb-6">{city.subtitle}</p>
        <h1 className="font-serif text-[clamp(56px,11vw,140px)] font-normal leading-[0.95] tracking-[-0.01em] text-ink">
          {city.name}
        </h1>
        <Ornament className="text-accent/70 mt-8" />
      </section>

      {/* Fun fact */}
      <section className="px-[clamp(24px,5vw,80px)] pb-4">
        <div className="max-w-2xl mx-auto border-y border-sand py-10 text-center">
          <p className="text-[11px] font-medium tracking-[3px] uppercase text-accent mb-4">Did You Know?</p>
          <p className="font-serif italic text-[clamp(20px,2.8vw,28px)] text-ink leading-snug">
            {city.funFact}
          </p>
        </div>
      </section>

      {/* Our take: the personal heart of the page */}
      <section className="px-[clamp(24px,5vw,80px)] py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[11px] font-medium tracking-[4px] uppercase text-accent mb-3">
              From Us
            </p>
            <h2 className="font-serif text-[clamp(28px,4vw,44px)] font-normal text-ink">
              Our {city.name}
            </h2>
          </div>
          <div className="space-y-6">
            {city.ourTake.map((para, i) => (
              <p
                key={i}
                className="text-[16px] md:text-[17px] text-ink-soft font-light leading-[1.9]"
              >
                {para}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Must-see */}
      <section className="px-[clamp(24px,5vw,80px)] pb-24">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[11px] font-medium tracking-[4px] uppercase text-accent mb-3">Our Favourites</p>
            <h2 className="font-serif text-[clamp(28px,4vw,44px)] font-normal text-ink">
              Must-Sees in {city.name}
            </h2>
          </div>

          <div className="space-y-0 border-t border-sand">
            {city.mustSee.map((item, i) => (
              <div key={i} className="flex gap-6 py-7 border-b border-sand items-baseline">
                <span className="font-serif text-2xl md:text-3xl leading-none w-8 shrink-0 tabular-nums" style={{ color: city.color }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-serif text-[clamp(20px,2.6vw,28px)] text-ink mb-1.5">
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-accent transition-colors duration-300 underline underline-offset-4 decoration-1 decoration-ink/20 hover:decoration-accent"
                      >
                        {item.name}
                      </a>
                    ) : (
                      item.name
                    )}
                  </h3>
                  <p className="text-[15px] text-ink-soft font-light leading-[1.8]">{item.note}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Where we eat & drink */}
          {city.ourSpots && city.ourSpots.length > 0 && (
            <div className="mt-24">
              <div className="text-center mb-12">
                <p className="text-[11px] font-medium tracking-[4px] uppercase text-accent mb-3">
                  Tried & Tested
                </p>
                <h2 className="font-serif text-[clamp(28px,4vw,44px)] font-normal text-ink">
                  Where We Eat &amp; Drink
                </h2>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                {city.ourSpots.map((spot, i) => (
                  <div
                    key={i}
                    className="border-t-2 pt-5"
                    style={{ borderColor: city.color }}
                  >
                    <h3 className="font-serif text-[clamp(19px,2.2vw,24px)] text-ink mb-2">
                      {spot.url ? (
                        <a
                          href={spot.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-accent transition-colors duration-300 underline underline-offset-4 decoration-1 decoration-ink/20 hover:decoration-accent"
                        >
                          {spot.name}
                        </a>
                      ) : (
                        spot.name
                      )}
                    </h3>
                    <p className="text-[15px] text-ink-soft font-light leading-[1.8]">
                      {spot.note}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Useful links */}
          {city.links && city.links.length > 0 && (
            <div className="mt-20 max-w-2xl mx-auto text-center">
              <p className="text-[11px] font-medium tracking-[4px] uppercase text-accent mb-5">
                Useful Links
              </p>
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
                {city.links.map((l) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] text-ink-soft font-light underline underline-offset-4 decoration-ink/25 hover:text-accent hover:decoration-accent transition-colors duration-300"
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* History: the context, kept last on purpose */}
          <div className="mt-24 max-w-2xl mx-auto">
            <h2 className="font-serif text-[clamp(24px,3.2vw,34px)] font-normal text-ink mb-5 text-center">
              A Little History
            </h2>
            <p className="text-[15px] md:text-[16px] text-ink-soft font-light leading-[1.9] text-center">
              {city.history}
            </p>
          </div>

          <div className="text-center mt-16">
            <Link
              to="/"
              className="inline-flex items-center gap-3 bg-dark text-cream px-10 py-4 text-[12px] font-medium tracking-[3px] uppercase transition-all duration-500 ease-out hover:bg-accent hover:-translate-y-0.5"
            >
              ← Back to Discover the Area
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
