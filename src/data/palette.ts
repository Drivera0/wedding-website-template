// Palette: Lake Como. Lake blue, teal, lemon, cypress and mist.
export const MOOD = {
  olive: "#7C8F5B",
  teal: "#2E7D8F",
  lemon: "#E9C46A",
  mist: "#C9DCE6",
  cypress: "#6F8F6A",
} as const;

// Accents cycled through decorative elements across the site.
// Teal is the site's main color; olive appears only as a leafy supporting detail.
export const ACCENTS = [MOOD.teal, MOOD.lemon, MOOD.cypress, MOOD.mist];
