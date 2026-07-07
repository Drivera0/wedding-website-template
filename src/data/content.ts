// ============================================================
//  SITE WORDING
// ============================================================
//  This file is the single source of truth for the wording on the site.
//  Edit a value here, commit, and it deploys.
//
//  It used to be editable from an Admin > Content tab that saved to a
//  site_content table, and those saved values silently overrode whatever was
//  written here. That caused a genuinely confusing bug once: the venue address
//  looked correct to whoever had edited it and wrong to everyone else. Since
//  every change now goes through the repo anyway, the tab and the database
//  override are gone and there is only one place to look.
//
//  All names, places and dates below are placeholders for the public demo.
//
//  Components read these through the useContent() hook: c("story.eyebrow").
// ============================================================

import { WEDDING } from "../config";

export const CONTENT_DEFAULTS: Record<string, string> = {
  // ── Our Story ──
  "story.eyebrow": "Our Story",
  "story.titleTop": "How it all",
  "story.titleAccent": "began",
  "story.body1":
    "Two people, one unforgettable adventure. From a chance meeting at a bookshop to traveling the world together, every chapter has led us here.",
  "story.body2":
    "Now we're writing the best one yet, and we want you to be part of it.",
  "story.t1.year": "2019",
  "story.t1.label": "We Met",
  "story.t2.year": "2021",
  "story.t2.label": "Moved In",
  "story.t3.year": "2024",
  "story.t3.label": "Engaged",

  // ── Wedding Details ──
  "details.eyebrow": "The Celebration",
  "details.title": "Wedding Details",

  "details.ceremony.label": "Ceremony",
  "details.ceremony.time": "4:30 PM",
  "details.ceremony.place": "Villa Serena",
  "details.ceremony.note": "Lake Como, Italy",

  "details.reception.label": "Reception",
  "details.reception.time": "5:30 PM",
  "details.reception.place": "Villa Serena",
  "details.reception.note": "Drinks on the terrace",

  "details.dinner.label": "Dinner",
  "details.dinner.time": "7:30 PM",
  "details.dinner.place": "The Lakeside Terrace",
  "details.dinner.note": "A long-table dinner of seasonal local dishes",

  "details.party.label": "Party",
  "details.party.time": "10:00 PM to Midnight",
  "details.party.place": "Dancing under the stars",
  "details.party.note": "Lorem ipsum dolor sit amet",

  "details.dresscode.label": "Dress Code",
  "details.dresscode.text":
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.",

  // ── Venue ──
  //  The map address comes from config so it sits next to the coordinates.
  //  Always keep the country on it: Google geocodes this string, and without
  //  a country it can drop the pin on a same-named street elsewhere.
  "venue.eyebrow": "Where",
  "venue.title": "The Venue",
  "venue.name": WEDDING.venueName,
  "venue.city": WEDDING.venueCity,
  "venue.query": WEDDING.venueQuery,

  // ── Invitation messages ──
  //  Sent from Admin > Invitations over WhatsApp or email. The {placeholders}
  //  are filled in for each guest: firstName, couple, date, venue, party,
  //  deadline, link and code. {party} reads "This invitation is for you and
  //  one guest." and so on, matching the party size.
  "invite.deadline": "1 March 2027",
  "invite.whatsapp":
    "Hi {firstName}!\n\nWe're getting married on {date} in {venue}, and we would love for you to be there.\n\n{party}\n\nPlease RSVP by {deadline} with your personal link:\n{link}\n\nYour invitation code is {code}. The link is just for you and can be used to RSVP once, so please don't forward it.\n\nWith love,\n{couple}",
  "invite.email.subject": "You're invited to {couple}'s wedding",
  "invite.email.body":
    "Dear {firstName},\n\nWe're getting married on {date} in {venue}, and we would love for you to be there.\n\n{party}\n\nPlease RSVP by {deadline} using your personal link:\n{link}\n\nYour invitation code is {code}, in case you need it. The link is just for you and can be used to RSVP once. You can come back to it any time to check the schedule, travel and venue details.\n\nWith love,\n{couple}",

  // Reminders, for invitations that were sent but haven't been answered yet.
  "invite.reminder.whatsapp":
    "Hi {firstName}! Just a gentle reminder about our wedding on {date} in {venue}. We'd love to know whether you can make it, so please RSVP by {deadline}:\n{link}\n\nIt only takes a minute. Thank you!\n{couple}",
  "invite.reminder.email.subject": "A little reminder: RSVP for {couple}'s wedding",
  "invite.reminder.email.body":
    "Dear {firstName},\n\nJust a gentle reminder about our wedding on {date} in {venue}. We'd love to know whether you can join us, so please RSVP by {deadline} using your personal link:\n{link}\n\nIt only takes a minute, and it helps us plan everything from the seating to the food.\n\nWith love,\n{couple}",
};
