/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Lake Como: soft stone neutrals with deep lake-blue darks
        cream: "#F7F4EC",  // soft stone, replaces plain white
        warm: "#ECE6D8",   // warm linen
        sand: "#D6CDB9",   // pale limestone border
        dark: "#1E3A4C",   // deep lake blue (dark sections)
        darker: "#14293A", // deeper blue (footer)
        ink: { DEFAULT: "#1F2F3B", soft: "#475865", muted: "#7A8A96", faint: "#B4C0C8" }, // blue-grey text
        // Accents: teal is the main one
        accent: { DEFAULT: "#2E7D8F", hover: "#22606F", light: "rgba(46,125,143,0.12)" },
        teal: "#2E7D8F",
        lemon: "#E9C46A",
        mist: "#C9DCE6",
        cypress: "#6F8F6A",
        rose: "#C8554B", // errors and destructive actions
        olive: "#7C8F5B", // leafy supporting accent
        sage: "#A3B09A",
        admin: "#0a0a0a",
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', "Georgia", "serif"],
        script: ['"Pinyon Script"', "cursive"],
        body: ['"Jost"', "-apple-system", "sans-serif"],
      },
      spacing: {
        // NOTE: don't add a key named "px" — it would override Tailwind's built-in px=1px
        // and blow up every h-px/w-px hairline (nav underline, hamburger lines).
        section: "clamp(80px, 12vw, 140px)",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.25, 1, 0.5, 1)",
        sharp: "cubic-bezier(0.65, 0, 0.35, 1)",
      },
    },
  },
  plugins: [],
};
