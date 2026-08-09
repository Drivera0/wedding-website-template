# Sending the invitations from Gmail

**Most of the time you won't need this.** The admin **Invitations** tab has a
**Send invitations** panel that opens WhatsApp or your mail app with each
guest's message already written, one guest after another. Use this Gmail mail
merge only if you want to email everyone in one go without clicking through.

## One-time setup

1. Open `/admin`, go to the **Invitations** tab, and add your guests, either
   one at a time or with **Import spreadsheet** (the template is linked there).
   Party size is the *total* number of people, so `2` means them plus one.
   Codes are generated for you.
2. Click **Download CSV**.
3. Create a new Google Sheet, then **File > Import** and upload the CSV.
   Keep the header row exactly as it is.
4. **Extensions > Apps Script**, delete the placeholder code, and paste in the
   whole of [`gmail-mail-merge.gs`](gmail-mail-merge.gs).
5. Edit the settings block at the top if you want to change the wording,
   subject line, or set a reply-to address.

## Sending

1. Run **`sendDraftToMyself`** first. It sends exactly one email, to you, using
   the first guest's details. Google will ask for permission the first time,
   which is normal: it's your own script sending as you.
2. Check it on your phone as well as your laptop, and check the link works.
3. Run **`sendAll`**. It writes `sent` plus a timestamp into a `merge_status`
   column as it goes, so if it stops halfway or you run it twice, nobody gets a
   duplicate.
4. Go back to the admin **Invitations** tab and click **Mark all as sent** so
   the dashboard matches reality.

## Adding guests later

Add them in the admin tab, download a fresh CSV, and paste only the new rows
into your existing Sheet. Rows already marked `sent` are skipped automatically.

## Limits and deliverability

- A free Gmail account sends about **500 emails a day**; Workspace about 2,000.
  For a typical guest list you are well within that. `sendAll` logs your remaining quota
  when it finishes.
- The script pauses ~1.2s between sends so it doesn't look like a burst.
- Because this sends from your personal Gmail rather than a verified domain,
  some invitations may land in Promotions or Spam. Two things help a lot:
  - Ask a few people to confirm they got it, and tell everyone to check spam.
  - If you later buy a domain, moving to a proper sending service fixes this
    properly. Say the word and I'll wire it up.

## What the guest sees

They get a personal link like `https://your-site/i/K7M2QX`. Opening it signs
them in, so there's no password and no code to type, and their name and email
are already filled in on the RSVP. Dietary needs and their plus-one's name are
left blank for them to complete. The link keeps working afterwards, so they can
come back any time to check the venue, dress code or travel notes.

They can RSVP **once**, for no more people than their invitation allows. Opening
the link again shows "You've already replied". If someone needs to change their
answer, delete their RSVP in the admin and their link works one more time.

The dashboard shows **opened** as soon as somebody follows their link, which is
a handy nudge signal: someone who opened but never responded probably meant to.
