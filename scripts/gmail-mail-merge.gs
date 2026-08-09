/**
 * Wedding invitation mail merge, sent from your own Gmail.
 *
 * Nothing here talks to the website. It reads a Google Sheet and sends one
 * personalised email per row, from whichever Google account owns the script.
 *
 * ── Setup ──────────────────────────────────────────────────────────────────
 *  1. In the admin dashboard, Invitations tab, click "Download CSV".
 *  2. Create a Google Sheet and File > Import the CSV into it. The first row
 *     must stay as the headers: name, email, code, link, guests_allowed, ...
 *  3. Extensions > Apps Script, delete the placeholder, paste this file in.
 *  4. Set SUBJECT and the couple's details below if you want to reword them.
 *  5. Run sendDraftToMyself() first. It emails ONE copy to you so you can see
 *     exactly what guests will get. Google will ask for permission the first
 *     time; that is expected, it is your own script sending as you.
 *  6. When it looks right, run sendAll(). It writes "sent" plus a timestamp
 *     into a status column so re-running never emails the same person twice.
 *  7. Back in the admin dashboard, click "Mark all as sent".
 *
 * ── Limits ─────────────────────────────────────────────────────────────────
 *  A free Gmail account can send roughly 500 emails a day, and Workspace
 *  around 2,000. For a typical guest list you are well inside that. The script
 *  pauses briefly between sends so it does not look like a burst of spam.
 */

// ── Settings ────────────────────────────────────────────────────────────────
var SUBJECT = "You're invited to Alex & Sam's wedding";
var COUPLE = "Alex & Sam";
var WEDDING_DATE = "12 June 2027";
var VENUE = "Villa Serena, Lake Como, Italy";
var RSVP_DEADLINE = "1 March 2027";
var REPLY_TO = ""; // optional, e.g. "you@example.com"
var PAUSE_MS = 1200; // gap between sends

// Column holding the send status. Created automatically if missing.
var STATUS_HEADER = "merge_status";

// ── Message ─────────────────────────────────────────────────────────────────

function buildBody(row) {
  var firstName = String(row.name || "").trim().split(/\s+/)[0] || "there";
  var partySize = Number(row.guests_allowed || 1);
  var partyLine =
    partySize > 1
      ? "Your invitation is for " + partySize + " people, so you can add your guest when you RSVP."
      : "Your invitation is for you.";

  var text =
    "Dear " + firstName + ",\n\n" +
    "We're getting married, and we would love for you to be there.\n\n" +
    COUPLE + "\n" +
    WEDDING_DATE + "\n" +
    VENUE + "\n\n" +
    "Everything you need is on our website: the schedule, how to get there, where to stay, " +
    "and a few of our favourite places nearby if you are making a trip of it.\n\n" +
    "Your personal link:\n" + row.link + "\n\n" +
    "That link is yours alone. It opens the site and knows who you are, so you can RSVP without " +
    "any passwords. You can RSVP once, so please let us know by " + RSVP_DEADLINE + ". You can come " +
    "back to the same link any time to check the details.\n\n" +
    "Your invitation code: " + row.code + "\n\n" +
    partyLine + "\n\n" +
    "With love,\n" + COUPLE + "\n";

  var html =
    '<div style="font-family:Georgia,serif;font-size:16px;line-height:1.7;color:#1F2F3B;max-width:540px">' +
    "<p>Dear " + escapeHtml(firstName) + ",</p>" +
    "<p>We're getting married, and we would love for you to be there.</p>" +
    '<p style="margin:24px 0;padding:20px 0;border-top:1px solid #D6CDB9;border-bottom:1px solid #D6CDB9;text-align:center">' +
    '<span style="font-size:22px;letter-spacing:1px">' + escapeHtml(COUPLE) + "</span><br>" +
    '<span style="font-size:14px;color:#6B7A85">' + escapeHtml(WEDDING_DATE) + "<br>" + escapeHtml(VENUE) + "</span>" +
    "</p>" +
    "<p>Everything you need is on our website: the schedule, how to get there, where to stay, and a " +
    "few of our favourite places nearby if you are making a trip of it.</p>" +
    '<p style="text-align:center;margin:28px 0">' +
    '<a href="' + encodeURI(row.link) + '" style="background:#2E7D8F;color:#fff;text-decoration:none;' +
    'padding:14px 30px;font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:2px;' +
    'text-transform:uppercase">Open your invitation</a>' +
    "</p>" +
    "<p>That link is yours alone. It opens the site and knows who you are, so you can RSVP without any " +
    "passwords. You can RSVP once, so please let us know by <strong>" + escapeHtml(RSVP_DEADLINE) + "</strong>. " +
    "You can come back to the same link any time to check the details.</p>" +
    "<p>Your invitation code: <strong>" + escapeHtml(row.code) + "</strong></p>" +
    "<p>" + escapeHtml(partyLine) + "</p>" +
    "<p>With love,<br>" + escapeHtml(COUPLE) + "</p>" +
    '<p style="font-size:12px;color:#8C99A3">If the button does not work, paste this into your browser:<br>' +
    escapeHtml(row.link) + "</p>" +
    "</div>";

  return { text: text, html: html };
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Sending ─────────────────────────────────────────────────────────────────

function sendDraftToMyself() {
  var rows = readRows();
  if (!rows.length) throw new Error("No rows found. Did you import the CSV?");
  var sample = rows[0];
  var body = buildBody(sample.data);
  var me = Session.getActiveUser().getEmail();
  GmailApp.sendEmail(me, "[TEST] " + SUBJECT, body.text, {
    htmlBody: body.html,
    name: COUPLE,
    replyTo: REPLY_TO || undefined,
  });
  Logger.log("Test copy of %s's invitation sent to %s", sample.data.name, me);
}

function sendAll() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var rows = readRows();
  var statusCol = ensureStatusColumn(sheet);
  var sent = 0, skipped = 0, failed = 0;

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var email = String(r.data.email || "").trim();
    var already = String(r.data[STATUS_HEADER] || "").trim();

    if (!email) { skipped++; sheet.getRange(r.rowNumber, statusCol).setValue("no email"); continue; }
    if (already.indexOf("sent") === 0) { skipped++; continue; }
    if (!r.data.link) { skipped++; sheet.getRange(r.rowNumber, statusCol).setValue("no link"); continue; }

    try {
      var body = buildBody(r.data);
      GmailApp.sendEmail(email, SUBJECT, body.text, {
        htmlBody: body.html,
        name: COUPLE,
        replyTo: REPLY_TO || undefined,
      });
      sheet.getRange(r.rowNumber, statusCol).setValue("sent " + new Date().toISOString());
      sent++;
      SpreadsheetApp.flush();
      Utilities.sleep(PAUSE_MS);
    } catch (err) {
      failed++;
      sheet.getRange(r.rowNumber, statusCol).setValue("FAILED: " + err.message);
    }
  }
  Logger.log("Sent %s, skipped %s, failed %s. Remaining quota today: %s",
    sent, skipped, failed, MailApp.getRemainingDailyQuota());
}

/** Clears the status column so sendAll() will send again. Use with care. */
function resetSendStatus() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var col = ensureStatusColumn(sheet);
  var last = sheet.getLastRow();
  if (last > 1) sheet.getRange(2, col, last - 1, 1).clearContent();
  Logger.log("Send status cleared. Every row will be emailed again on the next sendAll().");
}

// ── Sheet helpers ───────────────────────────────────────────────────────────

function readRows() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var data = {};
    for (var c = 0; c < headers.length; c++) data[headers[c]] = values[i][c];
    if (!String(data.name || "").trim()) continue;
    out.push({ rowNumber: i + 1, data: data });
  }
  return out;
}

function ensureStatusColumn(sheet) {
  var headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).trim().toLowerCase() === STATUS_HEADER) return i + 1;
  }
  var col = sheet.getLastColumn() + 1;
  sheet.getRange(1, col).setValue(STATUS_HEADER);
  return col;
}
