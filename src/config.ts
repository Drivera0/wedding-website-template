// ============================================================
//  SITE CONFIG :  edit your passwords & wedding details here
// ============================================================
//  This is the ONE place to find and change the site passwords
//  and the core wedding info (names, date, venue, map).
//
//  ⚠️  Heads up: this is a static front-end site, so the
//  passwords are visible to anyone who digs through the page
//  source. They keep out casual visitors, not determined
//  attackers: don't reuse an important/sensitive password here.
// ============================================================

// Password to ENTER THE SITE (the first screen every guest sees).
// Case-insensitive: "demo", "Demo", "DEMO" all work.
export const SITE_PASSWORD = "DEMO";

// ============================================================
//  ADMIN PASSWORD
// ============================================================
//  Deliberately NOT here any more. It used to live in this file, which meant
//  it shipped inside the JavaScript bundle for anyone to read, and it was the
//  only thing standing between a visitor and every guest's name and email.
//
//  It now lives in the database, in the app_secrets table, which no public key
//  can read. The login screen sends what you type to a database function that
//  checks it and pauses on a wrong answer.
//
//  To change it, run this in the Supabase SQL editor:
//
//    update app_secrets set value = 'your-new-password' where name = 'admin_key';

// ============================================================
//  RSVP
// ============================================================
//  There are no shared RSVP codes any more. A shared code
//  could be used any number of times, by anyone. Every guest now RSVPs with
//  their own invitation code, created in Admin > Invitations, and the database
//  accepts one RSVP per code, for no more people than that invitation allows.

// The web address guests are sent to in invitation links, e.g.
// "https://alex-and-sam.vercel.app". Leave it empty to use whatever
// address the admin page is open on, which is right on the live site but
// wrong if you send invitations from a local copy.
export const SITE_URL = "";

// ============================================================
//  WEDDING DETAILS :  edit these freely
// ============================================================
export const WEDDING = {
  coupleFirst: "Alex",
  coupleSecond: "Sam",
  // Short display date + the machine date used for the countdown
  dateLong: "The Twelfth of June · Two Thousand Twenty-Seven",
  dateShort: "12 June 2027",
  isoDate: "2027-06-12T16:30:00", // used for the countdown timer
  country: "Italy",

  // ---- Venue (shown in the Venue section + Google Map) ----
  //
  //  These are the built-in defaults. The admin content editor can override
  //  venueName / venueCity / venueQuery for everyone (they're stored in the
  //  site_content table), but keep these in sync anyway: they're what shows
  //  if the database is ever unreachable.
  //
  //  Always include the country in venueQuery. Google geocodes that string on
  //  every page load, and without ", Italy" it can drift to a same-named
  //  street elsewhere.
  venueName: "Villa Serena",
  venueCity: "Lake Como, Italy",
  // Fictional venue: the map just points at the city.
  venueQuery: "Como, Italy",

  // Optional but recommended: the venue's coordinates. When set, the site can
  // pin the map exactly instead of trusting Google to geocode the text above,
  // and it powers the no-Google fallback map. Grab them by right-clicking the
  // spot in Google Maps → the first line is "lat, lng".
  venueLat: null as number | null,
  venueLng: null as number | null,
} as const;

// Ready-to-use Google Maps URLs derived from venueQuery (no API key needed).
export const MAPS_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(
  WEDDING.venueQuery
)}&output=embed`;
export const MAPS_LINK_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  WEDDING.venueQuery
)}`;
