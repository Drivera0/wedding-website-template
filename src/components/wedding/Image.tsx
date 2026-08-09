import { useState } from "react";

interface Props {
  label?: string;
  className?: string;
  dark?: boolean;
  priority?: boolean;
  /** Explicit image URL (e.g. an admin-uploaded photo): overrides the label lookup. */
  src?: string;
}

// Local artwork assets (in /public/art): public-domain paintings from the Met
// Open Access collection (see public/art/CREDITS.txt). Shipped with the site so
// nothing depends on flaky external image hosts. Replace with your own photos
// anytime by dropping files in /public/art and updating the paths below.
const LOCAL_MAP: Record<string, string> = {
  "Hero Photo": "/art/lake-nemi.jpg", // Richard Wilson, Lake Nemi
  // Story and Gallery images: swap in your own photos here.
  "First Met": "/art/rainbow-landscape.jpg",
  "Together": "/art/aqueduct-evening.jpg",
  // Full-width scroll bands (Gallery).
  "Band One": "/art/lake-arreso.jpg",
  "Band Two": "/art/lake-fucino.jpg",
  "Band Three": "/art/optevoz.jpg",
};

// Optional Unsplash photo IDs by label, used when a label has no local file.
const UNSPLASH_MAP: Record<string, string> = {};

function getImageUrl(label: string, width: number = 800) {
  const id = UNSPLASH_MAP[label];
  return id
    ? `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`
    : null;
}

const SRCSET_WIDTHS = [400, 800, 1200] as const;

function getSrcSet(label: string): string | null {
  const id = UNSPLASH_MAP[label];
  if (!id) return null;
  return SRCSET_WIDTHS.map(
    (w) =>
      `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80 ${w}w`
  ).join(", ");
}

export default function PhotoPlaceholder({
  label = "Photo",
  className = "",
  dark = false,
  priority = false,
  src,
}: Props) {
  const local = LOCAL_MAP[label];
  const url = src ?? local ?? getImageUrl(label);
  const srcSet = src || local ? null : getSrcSet(label);
  const [loaded, setLoaded] = useState(false);

  if (url) {
    return (
      <div className={`relative w-full h-full overflow-hidden ${className}`}>
        {/* Shimmer placeholder while loading */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${
            loaded ? "opacity-0" : "opacity-100"
          }`}
          style={{
            background: dark
              ? "linear-gradient(145deg, #1A3344 0%, #1E3A4C 100%)"
              : "linear-gradient(145deg, #ECE6D8 0%, #D6CDB9 100%)",
          }}
        />
        <img
          src={url}
          srcSet={srcSet ?? undefined}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 800px"
          alt={label}
          loading={priority ? "eager" : "lazy"}
          onLoad={() => setLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-700 ease-smooth ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center flex-col gap-4 w-full h-full overflow-hidden ${className}`}
      style={{
        background: dark
          ? "linear-gradient(145deg, #193142 0%, #22435A 30%, #1C374A 60%, #1E3A4C 100%)"
          : "linear-gradient(145deg, #ECE6D8 0%, #D6CDB9 30%, #E6DFCF 60%, #CEC3AB 100%)",
      }}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke={dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}
        strokeWidth="0.75"
        strokeLinecap="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
      <span
        className={`text-[9px] font-medium tracking-[3px] uppercase font-body ${
          dark ? "text-cream/[0.05]" : "text-black/[0.05]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
