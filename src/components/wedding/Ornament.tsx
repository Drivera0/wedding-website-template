/**
 * A small hand-drawn botanical sprig (olive/laurel branch) used as an
 * elegant section divider: an ornamental nod to the Giona aesthetic.
 * Inherits color via `currentColor`, so set text color on the wrapper.
 */
export default function Ornament({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`} aria-hidden="true">
      <svg
        width="132"
        height="26"
        viewBox="0 0 132 26"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* left leaves: moodboard colours */}
        <path d="M60 13 C 46 13, 40 8, 30 8" />
        <path d="M50 13 C 48 8, 44 6, 40 7 C 44 9, 47 12, 50 13 Z" fill="#2E7D8F" fillOpacity="0.85" />
        <path d="M42 11 C 41 6, 37 5, 33 6 C 36 9, 39 11, 42 11 Z" fill="#E9C46A" fillOpacity="0.9" />
        <path d="M55 13 C 54 17, 50 19, 46 18 C 49 16, 52 14, 55 13 Z" fill="#6F8F6A" fillOpacity="0.8" />
        {/* right leaves (mirrored) */}
        <path d="M72 13 C 86 13, 92 8, 102 8" />
        <path d="M82 13 C 84 8, 88 6, 92 7 C 88 9, 85 12, 82 13 Z" fill="#6F8F6A" fillOpacity="0.8" />
        <path d="M90 11 C 91 6, 95 5, 99 6 C 96 9, 93 11, 90 11 Z" fill="#C9DCE6" fillOpacity="0.95" />
        <path d="M77 13 C 78 17, 82 19, 86 18 C 83 16, 80 14, 77 13 Z" fill="#2E7D8F" fillOpacity="0.85" />
        {/* center diamond */}
        <path d="M66 8 L 70 13 L 66 18 L 62 13 Z" fill="#7C8F5B" />
      </svg>
    </div>
  );
}
