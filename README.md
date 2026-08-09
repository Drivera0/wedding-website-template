# Wedding Website

A password-protected wedding website with personal invitations, RSVPs and an admin dashboard. This demo uses placeholder names, dates, a fictional venue and public-domain paintings in place of real photos.

## Features

- **Guest site**: cover with countdown, our story, schedule, venue map, travel guide, city guides and FAQ, with scroll animations and parallax
- **Personal invitations**: each guest gets their own code and link (`/i/<code>`), and the database accepts one RSVP per invitation, capped at that invitation's party size
- **RSVP form**: per-guest meal and dietary choices, song requests and an animated envelope
- **Admin dashboard** (`/admin`): guest list with spreadsheet (xlsx) import, invitation sending over WhatsApp or email, reminders, catering and music summaries, and table numbers
- **Security**: guest tables aren't exposed to the public API. Every read and write goes through Postgres functions that check the invitation code or the admin key (see [scripts/SECURITY.md](scripts/SECURITY.md))

## Stack

Vite, React 18, TypeScript, Tailwind CSS, Framer Motion, GSAP, Lenis, React Router, and Supabase (Postgres and RPC functions over REST, no SDK). Deployed on Vercel.

## Running it

```bash
npm install
npm run dev                  # http://localhost:5173
```

With no Supabase project configured, the site runs in **demo mode** (`src/lib/demo.ts`): made-up guests and invitations are kept in the browser, so everything works, including RSVPs and the admin dashboard.

- Site password: `DEMO` (set in `src/config.ts`; a soft gate checked in the browser, not a security boundary)
- Admin dashboard: `/admin`, password `demo`
- Invitation links: copy one from Admin > Invitations (`/i/<code>`) to RSVP as that guest

Demo data resets when you close the tab.

To use a real database, copy `.env.example` to `.env.local` and fill in your Supabase URL and anon key.

The SQL in `scripts/` sets up the invitation, RSVP and table-number functions. The admin password is stored in the database (`app_secrets.admin_key`) and never ships to the browser:

```sql
update app_secrets set value = 'a-long-random-password' where name = 'admin_key';
```

## Customizing

- Names, date and venue: `src/config.ts`
- All site wording and invitation message templates: `src/data/content.ts`
- City guides: `src/data/cities.ts`
- Images: `src/components/wedding/Image.tsx` (paintings credited in `public/art/CREDITS.txt`)
