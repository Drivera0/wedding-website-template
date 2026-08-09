# How guest data is protected

## The problem this solves

The site talks to Supabase directly from the browser using the "anon" public
key. That key is inside the JavaScript bundle, so **anyone who opens the site
can read it**. It is not a secret and was never meant to be one. Security has to
come from the database refusing requests, not from hiding the key.

Originally every table had a single permissive policy allowing the anon role to
do anything. That meant one HTTP request returned every RSVP: names, emails,
dietary needs, song requests. The admin password was also compiled into the
bundle in plain text.

Both are fixed.

## How it works now

| Table | Public access |
|---|---|
| `guests`, `plus_ones`, `guest_dietary` | **None.** RLS on, no policies. |
| `invitations` | **None.** RLS on, no policies. |
| `app_secrets` | **None.** RLS on, no policies. |
| `site_content`, `photos`, `dietary_options` | `SELECT` only. Writes are gated. |

Every legitimate operation goes through a `security definer` function that
decides what the caller may see or do:

**Guests can call:**
- `submit_rsvp(...)`: inserts the guest, their dietary options, their plus-ones
  and each plus-one's dietary options in one transaction, and links the RSVP to
  its invitation. Returns only the new id. It refuses, whatever the browser sends:
  - no invitation code, or an unknown one (`INVITE_REQUIRED`, `INVITE_INVALID`),
  - a code that already has an RSVP (`ALREADY_RESPONDED`). The invitation row is
    locked while it checks, so two submissions at the same moment can't both win,
  - more named plus-ones than the invitation allows (`TOO_MANY_GUESTS`).
- `resolve_invitation(code)`: returns the one matching invitation's name, email,
  party size and whether it has been answered, and stamps `opened_at`. A wrong
  code returns **zero rows**, so the table cannot be enumerated or dumped.

There are no shared RSVP codes. The old shared codes were checked only in
the browser and could be reused without limit; they are gone. To let a guest
change their answer, delete their RSVP in the admin: that reopens their link
once. The rules and their history are in `one-rsvp-per-invitation.sql`.

**The admin dashboard can call** `admin_list_guests`, `admin_update_guest_status`,
`admin_update_guest_notes`, `admin_delete_guest`, `admin_clear_guests`,
`admin_save_content`, `admin_add_photo`, `admin_delete_photo`, `admin_mark_sent`,
`admin_import_invitations`, and the `admin_*_invitation` family. Each one calls
`assert_admin(key)` first.

## The admin password

It is **not in the bundle**. It lives in `app_secrets`, which no public key can
read. The login screen sends what you type to `admin_check_key`, the database
compares it, and a wrong answer triggers a deliberate half-second pause before
failing, which makes guessing it over the network impractical.

To change it:

```sql
update app_secrets set value = 'your-new-password' where name = 'admin_key';
```

Nothing needs redeploying: it takes effect immediately.

## What is still not secret, on purpose

- **The site password** (`DEMO` in `src/config.ts`). Any password checked in
  the browser is readable in the browser. It keeps search engines and passers-by
  out; it is not a security boundary. Real identification comes from the
  personalised invitation links.
- **Which invitation codes exist** cannot be listed, but a code in a forwarded
  email works for whoever holds it. That is the same trade-off as any
  emailed magic link, and appropriate for a wedding.
- **`photos` and `site_content` are publicly readable**, because the site has to
  render them for guests. They contain wording and image URLs, nothing personal.

## Verifying it yourself

Grab the anon key from `src/lib/supabase.ts` and try to read the guest list:

```bash
KEY=<anon key>
URL=https://your-project.supabase.co
curl -s "$URL/rest/v1/guests?select=name,email" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"
# => []
```

An empty array means RLS refused it. A write attempt returns an explicit
`row-level security policy` error. Note that a `DELETE` returns HTTP 204 even
when it deletes nothing, so check the row count rather than trusting the status.

## If you want it airtight later

The remaining theoretical weakness is that the admin password travels from the
browser to the database on each privileged call, and any client-side check can
be inspected. Moving the admin calls into Vercel serverless functions holding a
service-role key would remove that. It is not necessary for a wedding site, and
the guest list is no longer exposed either way.
