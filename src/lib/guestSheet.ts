import {
  GROUPS,
  SIDES,
  emailLooksValid,
  phoneProblem,
  type InvitationDetails,
  type SendVia,
} from "./invitations";

// ============================================================
//  GUEST LIST SPREADSHEET IMPORT
// ============================================================
//  Reads the guest list template (public/guest-list-template.xlsx), or any
//  .xlsx / .csv with similar headers, into invitations ready to import.
//
//  Rows are either a main guest or a plus one. Only main guests become
//  invitations. Plus one rows sit directly under their main guest so the
//  spreadsheet can show the whole headcount; on import they are folded into
//  that main guest (their names go into the invitation's notes, and they can
//  fill in a missing party size). The guest still types the real names when
//  they RSVP.
//
//  An .xlsx file is a zip of XML files. Rather than ship a spreadsheet library
//  (hundreds of kB) for one admin button, this reads the zip with the
//  browser's built-in DecompressionStream and the XML with DOMParser.
//
//  Headers are matched loosely ("Phone (WhatsApp)", "phone", "WhatsApp" all
//  work) and the column order does not matter.
// ============================================================

export interface SheetRow {
  /** Row number as the spreadsheet shows it, for pointing at problems. */
  line: number;
  details: InvitationDetails;
  /** Names from the plus one rows under this main guest ("" when unnamed). */
  plusOnes: string[];
  /** Stops this row being imported. */
  errors: string[];
  /** Imported anyway, but worth fixing before sending. */
  warnings: string[];
}

export interface SheetResult {
  rows: SheetRow[];
  examplesSkipped: number;
  /** Plus one rows folded into their main guest. */
  plusOneRows: number;
  /** Plus one rows with no main guest above them, so they were ignored. */
  orphanPlusOnes: number;
}

/** The template ships with example rows carrying this note. */
const EXAMPLE_NOTE = "example row, delete me";

export async function readGuestSheet(file: File): Promise<SheetResult> {
  const isCsv = /\.csv$/i.test(file.name) || file.type === "text/csv";
  const table = isCsv ? parseCsv(await file.text()) : await readXlsx(await file.arrayBuffer());
  return toRows(table);
}

// ── Rows to invitations ─────────────────────────────────────

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

const HEADERS: Record<keyof InvitationDetails, string[]> = {
  name: ["name", "guest", "guestname", "mainguest", "fullname"],
  party: ["partysize", "party", "guestsallowed", "guests", "size", "people", "total"],
  sendVia: ["sendby", "sendvia", "send", "via", "method", "howtosend"],
  phone: ["phonewhatsapp", "phone", "whatsapp", "mobile", "phonenumber", "tel", "cell"],
  email: ["email", "emailaddress", "mail"],
  side: ["side", "whoseguest"],
  group: ["group", "guestgroup", "category"],
  notes: ["notes", "note", "comments", "comment"],
};
const TYPE_HEADERS = ["type", "rowtype", "guesttype", "role", "mainorplusone"];

/** "Plus one", "plus-one", "+1", "Plus two", "Guest of above"... */
const isPlusOne = (value: string) => {
  const v = value.toLowerCase();
  return /plus|\+\s*\d|guest\s*of|extra|partner/.test(v);
};

function matchSendVia(value: string): SendVia | "" | null {
  const v = norm(value);
  if (!v) return "";
  if (v === "both" || (v.includes("whatsapp") && v.includes("email"))) return "both";
  if (v.includes("whatsapp") || v === "wa" || v === "app") return "whatsapp";
  if (v.includes("mail")) return "email";
  if (v.includes("person") || v.includes("hand") || v === "post" || v === "none") return "in_person";
  return null;
}

/** Match a dropdown value case-insensitively, keeping anything else as typed. */
const matchOption = (value: string, options: string[]) =>
  options.find((o) => o.toLowerCase() === value.trim().toLowerCase()) ?? value.trim();

function toRows(table: string[][]): SheetResult {
  // The header is the first row with a "name" column. In the template that is
  // row 3, under the title and the hints.
  const headerIndex = table.slice(0, 15).findIndex((row) => row.some((c) => HEADERS.name.includes(norm(c))));
  if (headerIndex < 0) {
    throw new Error('Couldn\'t find a "Name" column. Keep the header row from the template.');
  }

  const header = table[headerIndex].map(norm);
  const findColumn = (aliases: string[]) => {
    const exact = header.findIndex((h) => aliases.includes(h));
    return exact >= 0 ? exact : header.findIndex((h) => aliases.some((alias) => h.startsWith(alias)));
  };
  const col = {} as Record<keyof InvitationDetails, number>;
  for (const key of Object.keys(HEADERS) as (keyof InvitationDetails)[]) col[key] = findColumn(HEADERS[key]);
  const typeCol = findColumn(TYPE_HEADERS);
  const cell = (row: string[], key: keyof InvitationDetails) => (col[key] >= 0 ? (row[col[key]] ?? "").trim() : "");

  const rows: SheetRow[] = [];
  const partyMissing = new Set<SheetRow>();
  const seen = new Map<string, number>();
  let examplesSkipped = 0;
  let plusOneRows = 0;
  let orphanPlusOnes = 0;
  // The most recent main guest, which plus one rows attach to. Reset by an
  // example row so the template's example plus one doesn't land on a real guest.
  let lastMain: SheetRow | null = null;

  table.slice(headerIndex + 1).forEach((row, i) => {
    const line = headerIndex + i + 2;
    const fields = (Object.keys(HEADERS) as (keyof InvitationDetails)[]).map((k) => cell(row, k));
    const type = typeCol >= 0 ? (row[typeCol] ?? "").trim() : "";
    const plusOne = isPlusOne(type);
    // The template pre-fills every row's Type with "Main guest", so a row with
    // nothing else filled in is empty. A plus one row counts even without a
    // name: it's a place whose guest isn't known yet.
    if (!plusOne && fields.every((f) => !f)) return;
    if (cell(row, "notes").toLowerCase() === EXAMPLE_NOTE) {
      examplesSkipped++;
      lastMain = null;
      return;
    }

    const name = cell(row, "name");

    if (plusOne) {
      if (lastMain) {
        lastMain.plusOnes.push(name);
        plusOneRows++;
      } else {
        orphanPlusOnes++;
      }
      return;
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!name) errors.push("No name");

    const partyText = cell(row, "party");
    let party = Number.parseInt(partyText, 10);
    let missing = false;
    if (!partyText) {
      party = 1;
      missing = true;
    } else if (!Number.isFinite(party) || party < 1 || party > 20) {
      errors.push(`Party size "${partyText}" isn't a number from 1 to 20`);
      party = 1;
    }

    const phone = cell(row, "phone");
    const email = cell(row, "email");
    const sendText = cell(row, "sendVia");
    let sendVia = matchSendVia(sendText);
    if (sendVia === null) {
      warnings.push(`"Send by" of "${sendText}" wasn't recognised`);
      sendVia = "";
    }
    // Nothing chosen: pick the obvious one from what they filled in.
    if (!sendVia) sendVia = phone && email ? "both" : phone ? "whatsapp" : email ? "email" : "";

    if ((sendVia === "whatsapp" || sendVia === "both") && !phone) warnings.push("WhatsApp chosen but no phone number");
    if ((sendVia === "email" || sendVia === "both") && !email) warnings.push("Email chosen but no email address");
    const phoneIssue = phoneProblem(phone);
    if (phoneIssue) warnings.push(`Phone: ${phoneIssue}`);
    if (email && !emailLooksValid(email)) warnings.push("Email doesn't look right");

    if (name) {
      const key = name.toLowerCase();
      const first = seen.get(key);
      if (first) errors.push(`Same name as row ${first}`);
      else seen.set(key, line);
    }

    const sheetRow: SheetRow = {
      line,
      errors,
      warnings,
      plusOnes: [],
      details: {
        name,
        party,
        sendVia,
        phone,
        email,
        side: matchOption(cell(row, "side"), SIDES),
        group: matchOption(cell(row, "group"), GROUPS),
        notes: cell(row, "notes"),
      },
    };
    if (missing) partyMissing.add(sheetRow);
    rows.push(sheetRow);
    lastMain = sheetRow;
  });

  // Now that every plus one has found its main guest, square up party sizes.
  for (const r of rows) {
    const listed = r.plusOnes.length;
    if (partyMissing.has(r)) {
      r.details.party = 1 + listed;
      r.warnings.unshift(
        listed
          ? `No party size, so it's set to ${r.details.party} from the plus ones listed`
          : "No party size, so it's set to 1"
      );
    } else if (listed > r.details.party - 1) {
      r.warnings.unshift(
        `${listed} plus ${listed === 1 ? "one" : "ones"} listed, but party size ${r.details.party} allows ${r.details.party - 1}`
      );
    }
    const named = r.plusOnes.filter(Boolean);
    if (named.length) {
      const line = `Plus ones: ${named.join(", ")}`;
      r.details.notes = r.details.notes ? `${r.details.notes}. ${line}` : line;
    }
  }

  return { rows, examplesSkipped, plusOneRows, orphanPlusOnes };
}

// ── CSV ─────────────────────────────────────────────────────

function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [",", ";", "\t"].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ── XLSX ────────────────────────────────────────────────────

async function unzip(buf: ArrayBuffer): Promise<Map<string, () => Promise<string>>> {
  const view = new DataView(buf);
  // The end-of-central-directory record sits in the last 64 kB.
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("That file isn't a valid .xlsx spreadsheet.");

  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const files = new Map<string, () => Promise<string>>();
  const decoder = new TextDecoder();

  for (let n = 0; n < count; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const size = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const name = decoder.decode(new Uint8Array(buf, p + 46, nameLen));
    p += 46 + nameLen + extraLen + commentLen;

    // Sizes come from the central directory: the local header may leave them
    // blank when the writer streamed the file.
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const data = buf.slice(start, start + size);
    files.set(name, async () => {
      if (method === 0) return decoder.decode(data);
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return new Response(stream).text();
    });
  }
  return files;
}

const xml = (text: string) => new DOMParser().parseFromString(text, "application/xml");
const all = (node: Document | Element, tag: string) => Array.from(node.getElementsByTagNameNS("*", tag));

async function readXlsx(buf: ArrayBuffer): Promise<string[][]> {
  const files = await unzip(buf);
  const read = async (path: string) => {
    const get = files.get(path);
    return get ? xml(await get()) : null;
  };

  const workbook = await read("xl/workbook.xml");
  const rels = await read("xl/_rels/workbook.xml.rels");
  if (!workbook || !rels) throw new Error("That file isn't a valid .xlsx spreadsheet.");

  // Prefer a visible sheet called something like "Guest List", else the first visible one.
  const sheets = all(workbook, "sheet").filter((s) => !/hidden/i.test(s.getAttribute("state") ?? ""));
  const sheet = sheets.find((s) => /guest/i.test(s.getAttribute("name") ?? "")) ?? sheets[0];
  if (!sheet) throw new Error("That spreadsheet has no visible sheets.");

  const relId = sheet.getAttribute("r:id") ?? sheet.getAttributeNS("*", "id");
  const target = all(rels, "Relationship").find((r) => r.getAttribute("Id") === relId)?.getAttribute("Target");
  if (!target) throw new Error("Couldn't find the guest list sheet inside that file.");
  const sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target}`;

  const shared = await read("xl/sharedStrings.xml");
  const strings = shared
    ? all(shared, "si").map((si) =>
        all(si, "t")
          .filter((t) => (t.parentElement?.localName ?? "") !== "rPh") // skip phonetic hints
          .map((t) => t.textContent ?? "")
          .join("")
      )
    : [];

  const doc = await read(sheetPath);
  if (!doc) throw new Error("Couldn't read the guest list sheet inside that file.");

  const table: string[][] = [];
  for (const row of all(doc, "row")) {
    const r = Number(row.getAttribute("r")) - 1;
    const cells: string[] = [];
    for (const c of all(row, "c")) {
      const ref = c.getAttribute("r") ?? "";
      const letters = ref.replace(/\d+/g, "");
      const index = letters ? [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1 : cells.length;
      const type = c.getAttribute("t");
      const v = all(c, "v")[0]?.textContent ?? "";
      let value: string;
      if (type === "s") value = strings[Number(v)] ?? "";
      else if (type === "inlineStr") value = all(c, "t").map((t) => t.textContent ?? "").join("");
      else if (type === "b") value = v === "1" ? "TRUE" : "FALSE";
      // A phone typed as a plain number can come back as 1.5550100000E10.
      else if (!type && /e\+/i.test(v)) value = Number(v).toFixed(0);
      else value = v;
      cells[index] = value;
    }
    table[r >= 0 ? r : table.length] = Array.from(cells, (x) => x ?? "");
  }
  return Array.from(table, (x) => x ?? []);
}
