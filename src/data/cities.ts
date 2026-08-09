// ============================================================
//  DISCOVER THE AREA: city guides
// ============================================================
//  Each city gets its own page at /discover/<slug>. Placeholder content.
//
//  `ourTake`   = paragraphs in the couple's own voice.
//  `mustSee`   = the sights.
//  `ourSpots`  = favourite cafés, bars and restaurants.
// ============================================================

export interface City {
  slug: string;
  name: string;
  subtitle: string;
  color: string; // signature accent colour (from the moodboard palette)
  blurb: string; // short text on the Discover card
  funFact: string;
  ourTake: string[]; // personal narrative, one string per paragraph
  history: string;
  mustSee: { name: string; note: string; url?: string }[];
  ourSpots?: { name: string; note: string; url?: string }[];
  /** Official tourist board and other useful links for the city. */
  links?: { label: string; url: string }[];
}

export const CITIES: City[] = [
  {
    slug: "como",
    name: "Como",
    subtitle: "The Lakeside Town",
    color: "#2E7D8F",
    blurb: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor.",
    funFact: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    ourTake: [
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    ],
    history: "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    mustSee: [
      { name: "Lorem Ipsum", note: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." },
      { name: "Dolor Sit", note: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat." },
      { name: "Consectetur", note: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur." },
    ],
    ourSpots: [
      { name: "Café Lorem", note: "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum." },
      { name: "Bar Ipsum", note: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." },
    ],
  },
  {
    slug: "bellagio",
    name: "Bellagio",
    subtitle: "Pearl of the Lake",
    color: "#E9C46A",
    blurb: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
    funFact: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    ourTake: [
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    ],
    history: "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    mustSee: [
      { name: "Lorem Ipsum", note: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." },
      { name: "Dolor Sit", note: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat." },
      { name: "Consectetur", note: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur." },
    ],
    ourSpots: [
      { name: "Café Lorem", note: "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum." },
      { name: "Bar Ipsum", note: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." },
    ],
  },
  {
    slug: "varenna",
    name: "Varenna",
    subtitle: "Colourful Harbour",
    color: "#6F8F6A",
    blurb: "Duis aute irure dolor in reprehenderit in voluptate velit esse.",
    funFact: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    ourTake: [
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    ],
    history: "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    mustSee: [
      { name: "Lorem Ipsum", note: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." },
      { name: "Dolor Sit", note: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat." },
      { name: "Consectetur", note: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur." },
    ],
    ourSpots: [
      { name: "Café Lorem", note: "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum." },
      { name: "Bar Ipsum", note: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." },
    ],
  },
  {
    slug: "milan",
    name: "Milan",
    subtitle: "The Big City",
    color: "#C9DCE6",
    blurb: "Excepteur sint occaecat cupidatat non proident, sunt in culpa.",
    funFact: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    ourTake: [
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    ],
    history: "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    mustSee: [
      { name: "Lorem Ipsum", note: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." },
      { name: "Dolor Sit", note: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat." },
      { name: "Consectetur", note: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur." },
    ],
    ourSpots: [
      { name: "Café Lorem", note: "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum." },
      { name: "Bar Ipsum", note: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." },
    ],
  },
];

export const cityBySlug = (slug: string | undefined) =>
  CITIES.find((c) => c.slug === slug);
