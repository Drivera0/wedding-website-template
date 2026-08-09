import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../Toast";
import { readGuestSheet, type SheetResult } from "../../lib/guestSheet";
import {
  GROUPS,
  SEND_VIA_LABEL,
  SIDES,
  addInvitation,
  channelsFor,
  deleteInvitation,
  detailsOf,
  downloadFile,
  getReminded,
  gmailUrl,
  importInvitations,
  inviteMessage,
  inviteUrl,
  invitationsCsv,
  linksPointAtLocalhost,
  listInvitations,
  markReminded,
  markSent,
  needsReminder,
  phoneProblem,
  reopenInvitation,
  toAdditional,
  toParty,
  updateInvitation,
  whatsappUrl,
  type Invitation,
  type InvitationDetails,
  type MessageKind,
  type SendVia,
} from "../../lib/invitations";

// ============================================================
//  INVITATIONS
// ============================================================
//  Add guests one at a time or import the guest list spreadsheet, then send
//  each their personal link over WhatsApp or Gmail, and nudge anyone who
//  hasn't replied with a reminder.
//
//  Sending opens WhatsApp or Gmail with the message already written, and you
//  press send. Fully automatic WhatsApp sending needs a WhatsApp Business API
//  account (Meta business verification, pre-approved message templates, a
//  paid number), which is a lot of setup for a guest list. For
//  bulk email without clicking, see scripts/gmail-mail-merge.md.
//
//  Party size is entered and shown as the TOTAL number of people on the
//  invitation; the conversion to "additional guests" lives in invitations.ts.
// ============================================================

type Filter = "all" | "unsent" | "sent" | "opened" | "responded" | "no-reply";
type Channel = "whatsapp" | "email";

const statusOf = (i: Invitation) =>
  i.responded_at || i.guest ? "responded" : i.opened_at ? "opened" : i.sent_at ? "sent" : "unsent";

const STATUS_STYLE: Record<string, string> = {
  unsent: "text-white/45 border-white/15",
  sent: "text-[#E9C46A] border-[#E9C46A]/40",
  opened: "text-[#C9DCE6] border-[#C9DCE6]/40",
  responded: "text-[#8FBF7F] border-[#8FBF7F]/40",
};

const COLS =
  "grid grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_72px_52px_104px_minmax(0,1fr)_236px] gap-3";

const input =
  "w-full min-w-0 py-2 px-3 bg-[#121212] border border-white/[0.08] text-[13px] text-cream/90 font-light placeholder:text-white/30 focus:border-accent/40 transition-colors duration-200 outline-none rounded-sm";

const smallButton =
  "text-[10px] tracking-[1px] uppercase text-white/55 hover:text-accent transition-colors duration-200 disabled:opacity-30";

const fmtDate = (d: string | undefined | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null;

const blank = (): InvitationDetails => ({
  name: "", email: "", phone: "", party: 2, sendVia: "whatsapp", side: "", group: "", notes: "",
});

/** The fields for one invitation, shared by the add form and the edit panel. */
function DetailsFields({
  value,
  onChange,
  onEnter,
  autoFocus,
}: {
  value: InvitationDetails;
  onChange: (v: InvitationDetails) => void;
  onEnter?: () => void;
  autoFocus?: boolean;
}) {
  const set = <K extends keyof InvitationDetails>(k: K, v: InvitationDetails[K]) => onChange({ ...value, [k]: v });
  const enter = (e: React.KeyboardEvent) => { if (e.key === "Enter") onEnter?.(); };
  const phoneIssue = phoneProblem(value.phone);

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_104px_150px_minmax(0,1.2fr)_minmax(0,1.4fr)_112px_104px]">
      <input className={input} placeholder="Name on the invitation" value={value.name} autoFocus={autoFocus}
        onChange={(e) => set("name", e.target.value)} onKeyDown={enter} />
      <select className={input} value={value.party} onChange={(e) => set("party", Number(e.target.value))}
        title="Total people, including them">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>{n === 1 ? "Just them" : `Party of ${n}`}</option>
        ))}
      </select>
      <select className={input} value={value.sendVia} onChange={(e) => set("sendVia", e.target.value as SendVia | "")}>
        <option value="">Send by…</option>
        {(Object.keys(SEND_VIA_LABEL) as SendVia[]).map((k) => (
          <option key={k} value={k}>{SEND_VIA_LABEL[k]}</option>
        ))}
      </select>
      <div className="min-w-0">
        <input className={`${input} ${phoneIssue ? "border-[#E9C46A]/50" : ""}`} placeholder="+1 555 010 0000"
          value={value.phone} onChange={(e) => set("phone", e.target.value)} onKeyDown={enter} />
        {phoneIssue && <p className="text-[11px] text-[#E9C46A]/80 mt-1">{phoneIssue}</p>}
      </div>
      <input className={input} placeholder="Email" type="email" value={value.email}
        onChange={(e) => set("email", e.target.value)} onKeyDown={enter} />
      <select className={input} value={value.side} onChange={(e) => set("side", e.target.value)}>
        <option value="">Side…</option>
        {SIDES.map((s) => <option key={s} value={s}>{s}</option>)}
        {value.side && !SIDES.includes(value.side) && <option value={value.side}>{value.side}</option>}
      </select>
      <select className={input} value={value.group} onChange={(e) => set("group", e.target.value)}>
        <option value="">Group…</option>
        {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        {value.group && !GROUPS.includes(value.group) && <option value={value.group}>{value.group}</option>}
      </select>
    </div>
  );
}

// ── Spreadsheet import ──────────────────────────────────────

function ImportPanel({ existing, onImported }: { existing: Invitation[]; onImported: (rows: Invitation[]) => void }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<SheetResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const existingNames = useMemo(() => new Set(existing.map((r) => r.name.trim().toLowerCase())), [existing]);
  const onList = (name: string) => existingNames.has(name.trim().toLowerCase());

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setResult(null);
    setFileName(file.name);
    try {
      setResult(await readGuestSheet(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that file.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const rows = result?.rows ?? [];
  const ready = rows.filter((r) => !r.errors.length && !onList(r.details.name));
  const already = rows.filter((r) => !r.errors.length && onList(r.details.name)).length;
  const broken = rows.filter((r) => r.errors.length).length;
  const warned = ready.filter((r) => r.warnings.length).length;

  const runImport = async () => {
    setBusy(true);
    try {
      const { added, skipped } = await importInvitations(ready.map((r) => r.details));
      onImported(added);
      setResult(null);
      toast(
        `Imported ${added.length} invitation${added.length === 1 ? "" : "s"}` +
          (skipped.length ? `, skipped ${skipped.length} already on the list.` : "."),
        "success"
      );
    } catch {
      toast("The import failed, and nothing was added. Try again.", "error");
    }
    setBusy(false);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files[0]); }}
      className={`rounded-sm transition-colors duration-200 ${dragging ? "bg-accent/[0.06]" : ""}`}
    >
      <ol className="grid gap-3 sm:grid-cols-3 mb-4">
        <li className="border border-white/[0.07] rounded-sm p-3">
          <p className="text-[10px] tracking-[1.5px] uppercase text-accent mb-1">1 · Get the template</p>
          <p className="text-[12px] text-white/50 font-light mb-2">An Excel sheet with dropdowns and a Ready? check on every row.</p>
          <a href="/guest-list-template.xlsx" download="Guest List.xlsx" className={`${smallButton} text-accent/85`}>
            Download template
          </a>
        </li>
        <li className="border border-white/[0.07] rounded-sm p-3">
          <p className="text-[10px] tracking-[1.5px] uppercase text-accent mb-1">2 · Fill it in</p>
          <p className="text-[12px] text-white/50 font-light">
            One main guest row per invitation, with any plus ones on rows under them. Party size is the
            total people. Phone numbers need the country code.
          </p>
        </li>
        <li className="border border-white/[0.07] rounded-sm p-3">
          <p className="text-[10px] tracking-[1.5px] uppercase text-accent mb-1">3 · Import it</p>
          <p className="text-[12px] text-white/50 font-light mb-2">Drop the file here or choose it. You'll see a preview first.</p>
          <button onClick={() => fileRef.current?.click()} className={`${smallButton} text-accent/85`}>
            Choose file (.xlsx or .csv)
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden"
            onChange={(e) => choose(e.target.files?.[0])} />
        </li>
      </ol>

      {error && (
        <p className="text-[13px] text-rose bg-rose/10 border border-rose/25 rounded-sm px-3 py-2 mb-3">
          {fileName}: {error}
        </p>
      )}

      {result && (
        <div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mb-3 text-[12px]">
            <span className="text-white/60">{fileName}</span>
            <span className="text-[#8FBF7F]">{ready.length} ready to import</span>
            {warned > 0 && <span className="text-[#E9C46A]/85">{warned} of those need a look before sending</span>}
            {already > 0 && <span className="text-white/45">{already} already on your list, skipped</span>}
            {broken > 0 && <span className="text-rose/85">{broken} with problems, skipped</span>}
            {result.plusOneRows > 0 && (
              <span className="text-white/45">
                {result.plusOneRows} plus one {result.plusOneRows === 1 ? "row" : "rows"} added to their main guest, not invited separately
              </span>
            )}
            {result.orphanPlusOnes > 0 && (
              <span className="text-[#E9C46A]/85">
                {result.orphanPlusOnes} plus one {result.orphanPlusOnes === 1 ? "row has" : "rows have"} no main guest above, ignored
              </span>
            )}
            {result.examplesSkipped > 0 && <span className="text-white/35">example rows ignored</span>}
          </div>

          {rows.length === 0 ? (
            <p className="text-[13px] text-white/45 py-6 text-center border border-white/[0.07] rounded-sm">
              No guests found in that file. Is the Guest List sheet filled in?
            </p>
          ) : (
            <div className="border border-white/[0.07] rounded-sm max-h-[420px] overflow-auto">
              <table className="w-full min-w-[860px] text-[12px]">
                <thead className="sticky top-0 bg-[#151515] text-[10px] tracking-[1px] uppercase text-white/40">
                  <tr className="text-left">
                    {["Row", "Name", "Party", "Send by", "Phone", "Email", "Side · Group", "Check"].map((h) => (
                      <th key={h} className="px-3 py-2 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const skip = r.errors.length > 0 || onList(r.details.name);
                    return (
                      <tr key={r.line} className={`border-t border-white/[0.05] align-top ${skip ? "opacity-50" : ""}`}>
                        <td className="px-3 py-2 text-white/35 tabular-nums">{r.line}</td>
                        <td className="px-3 py-2 text-cream/85">
                          {r.details.name || <span className="text-rose/80">missing</span>}
                          {r.plusOnes.map((po, i) => (
                            <span key={i} className="block text-[11px] text-white/40">
                              <span className="text-accent/60">↳</span> {po || "plus one, name TBC"}
                            </span>
                          ))}
                        </td>
                        <td className="px-3 py-2 text-white/65 tabular-nums">{r.details.party}</td>
                        <td className="px-3 py-2 text-white/65">{r.details.sendVia ? SEND_VIA_LABEL[r.details.sendVia] : ""}</td>
                        <td className="px-3 py-2 text-white/65">{r.details.phone}</td>
                        <td className="px-3 py-2 text-white/65 break-all">{r.details.email}</td>
                        <td className="px-3 py-2 text-white/50">{[r.details.side, r.details.group].filter(Boolean).join(" · ")}</td>
                        <td className="px-3 py-2">
                          {r.errors.map((m) => <span key={m} className="block text-rose/90">{m}</span>)}
                          {!r.errors.length && onList(r.details.name) && <span className="block text-white/45">Already on your list</span>}
                          {!skip && r.warnings.map((m) => <span key={m} className="block text-[#E9C46A]/85">{m}</span>)}
                          {!skip && !r.warnings.length && <span className="text-[#8FBF7F]">✓ Ready</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center gap-4 mt-3">
            <button
              onClick={runImport}
              disabled={busy || ready.length === 0}
              className="text-[11px] font-semibold tracking-[2px] uppercase text-white bg-accent px-6 py-2.5 rounded-sm transition-all duration-300 hover:bg-accent-hover disabled:opacity-30"
            >
              {busy ? "Importing…" : `Import ${ready.length} invitation${ready.length === 1 ? "" : "s"}`}
            </button>
            <button onClick={() => setResult(null)} className="text-[11px] tracking-[1.5px] uppercase text-white/45 hover:text-white/70">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sending invitations and reminders ───────────────────────

function SendPanel({
  rows,
  reminded,
  onOpen,
  onDone,
}: {
  rows: Invitation[];
  reminded: Record<string, string>;
  onOpen: (r: Invitation, channel: Channel, kind: MessageKind) => void;
  onDone: (r: Invitation, kind: MessageKind) => Promise<void>;
}) {
  const [mode, setMode] = useState<MessageKind>("invite");
  const [skipped, setSkipped] = useState<string[]>([]);
  const [openedId, setOpenedId] = useState<string | null>(null);

  const reachable = (r: Invitation) => {
    const c = channelsFor(r);
    return c.whatsapp || c.email;
  };
  const inviteQueue = rows.filter((r) => !r.sent_at && !r.guest && reachable(r));
  // Never-reminded first, then whoever was reminded longest ago.
  const reminderQueue = rows
    .filter((r) => needsReminder(r) && reachable(r))
    .sort((a, b) => (reminded[a.id] ?? "").localeCompare(reminded[b.id] ?? ""));
  const queue = mode === "invite" ? inviteQueue : reminderQueue;
  const waiting = queue.filter((r) => !skipped.includes(r.id));
  const current = waiting[0] ?? null;
  const message = current ? inviteMessage(current, mode) : null;
  const channels = current ? channelsFor(current) : { whatsapp: false, email: false };

  const switchMode = (m: MessageKind) => {
    setMode(m);
    setSkipped([]);
    setOpenedId(null);
  };

  const open = (channel: Channel) => {
    if (!current) return;
    onOpen(current, channel, mode);
    setOpenedId(current.id);
  };

  const next = async (sent: boolean) => {
    if (!current) return;
    if (sent) await onDone(current, mode);
    // A reminder stays in its queue after sending, so step past it explicitly.
    if (!sent || mode === "reminder") setSkipped((s) => [...s, current.id]);
    setOpenedId(null);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {([["invite", "New invitations", inviteQueue.length], ["reminder", "Reminders", reminderQueue.length]] as const).map(
          ([m, label, n]) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`px-3 py-1.5 text-[10px] tracking-[1.5px] uppercase rounded-sm border transition-colors duration-200 ${
                mode === m ? "border-accent/60 text-cream bg-accent/10" : "border-white/10 text-white/50 hover:text-white/80"
              }`}
            >
              {label} · {n}
            </button>
          )
        )}
      </div>

      {linksPointAtLocalhost() && (
        <p className="text-[12px] text-[#E9C46A] bg-[#E9C46A]/10 border border-[#E9C46A]/25 rounded-sm px-3 py-2 mb-4">
          You're on a local copy of the site, so links would point at this computer. Send from the live
          admin page, or set SITE_URL in src/config.ts.
        </p>
      )}

      {!current ? (
        <p className="text-[13px] text-white/45 font-light">
          {queue.length === 0
            ? mode === "invite"
              ? "Nothing waiting to send. Invitations appear here once they have a phone number or email and haven't been sent."
              : "Nobody to remind. Invitations appear here once they've been sent and haven't been answered."
            : mode === "invite"
              ? "You skipped the rest for now."
              : "That's everyone reminded for now."}
          {skipped.length > 0 && (
            <button onClick={() => setSkipped([])} className={`${smallButton} ml-3 text-accent/85`}>Start again</button>
          )}
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div>
            <p className="text-[11px] text-white/40 mb-1">
              Next up · {waiting.length} {mode === "invite" ? "left to send" : "left to remind"}
            </p>
            <p className="font-serif text-2xl text-cream mb-1">{current.name}</p>
            <p className="text-[12px] text-white/50 mb-1">
              Party of {toParty(current.max_additional)}
              {current.phone && <> · {current.phone}</>}
              {current.email && <> · {current.email}</>}
            </p>
            {mode === "reminder" && (
              <p className="text-[12px] text-white/40 mb-4">
                Invited {fmtDate(current.sent_at)}
                {current.opened_at ? `, opened the link ${fmtDate(current.opened_at)}` : ", hasn't opened the link"}
                {reminded[current.id] ? `. Last reminded ${fmtDate(reminded[current.id])}.` : ". Not reminded yet."}
              </p>
            )}
            {mode === "invite" && <div className="mb-3" />}

            {openedId === current.id ? (
              <div className="border border-white/[0.08] rounded-sm p-3">
                <p className="text-[13px] text-cream/85 mb-3">Did it send?</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => next(true)}
                    className="text-[11px] font-semibold tracking-[1.5px] uppercase text-white bg-accent px-4 py-2 rounded-sm hover:bg-accent-hover transition-colors duration-200">
                    Yes, next guest
                  </button>
                  <button onClick={() => setOpenedId(null)}
                    className="text-[11px] tracking-[1.5px] uppercase text-white/60 border border-white/15 px-4 py-2 rounded-sm hover:text-cream transition-colors duration-200">
                    Not yet
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {channels.whatsapp && (
                  <button onClick={() => open("whatsapp")}
                    className="text-[11px] font-semibold tracking-[1.5px] uppercase text-white bg-[#1F9D55] hover:bg-[#1A8A4A] px-4 py-2.5 rounded-sm transition-colors duration-200">
                    Open WhatsApp
                  </button>
                )}
                {channels.email && (
                  <button onClick={() => open("email")}
                    className="text-[11px] font-semibold tracking-[1.5px] uppercase text-white bg-accent hover:bg-accent-hover px-4 py-2.5 rounded-sm transition-colors duration-200">
                    Open Gmail
                  </button>
                )}
                <button onClick={() => next(false)}
                  className="text-[11px] tracking-[1.5px] uppercase text-white/50 hover:text-white/80 px-3 py-2 transition-colors duration-200">
                  Skip
                </button>
              </div>
            )}

            {mode === "invite" ? (
              <p className="text-[12px] text-white/35 font-light leading-relaxed mt-5">
                <span className="text-white/55">Test it on yourself first:</span> add yourself as an invitation with your
                own number, send it, open the link on your phone and RSVP. Open the link again and it will say you've
                already replied. Then delete your test invitation from the list below.
              </p>
            ) : (
              <p className="text-[12px] text-white/35 font-light leading-relaxed mt-5">
                Reminders are for invitations that were sent but haven't been answered. When you last reminded
                someone is remembered on this computer.
              </p>
            )}
          </div>

          <div>
            <p className="text-[10px] tracking-[1.5px] uppercase text-white/40 mb-1.5">
              {mode === "invite" ? "Message" : "Reminder"} preview{channels.whatsapp ? " (WhatsApp)" : " (email)"}
            </p>
            <pre className="whitespace-pre-wrap font-body text-[12.5px] leading-relaxed text-white/75 bg-white/[0.03] border border-white/[0.07] rounded-sm p-3 max-h-72 overflow-auto">
              {channels.whatsapp ? message?.whatsapp : `Subject: ${message?.subject}\n\n${message?.email}`}
            </pre>
            <p className="text-[11px] text-white/30 mt-1.5">
              Wording lives in src/data/content.ts under "{mode === "invite" ? "invite." : "invite.reminder."}".
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── The tab ─────────────────────────────────────────────────

export default function InvitationsTab() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [panel, setPanel] = useState<"send" | "add" | "import">("send");
  const [draft, setDraft] = useState<InvitationDetails>(blank());
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<InvitationDetails>(blank());
  const [reminded, setReminded] = useState<Record<string, string>>(() => getReminded());

  const load = useCallback(async () => {
    try {
      setRows(await listInvitations());
    } catch {
      toast("Couldn't load invitations.", "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Start on Import while the list is empty; there's nothing to send yet.
  useEffect(() => {
    if (!loading && rows.length === 0) setPanel((p) => (p === "send" ? "import" : p));
  }, [loading, rows.length]);

  const patch = (id: string, changes: Partial<Invitation>) =>
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...changes } : r)));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = rows;
    if (filter === "no-reply") out = out.filter(needsReminder);
    else if (filter !== "all") out = out.filter((r) => statusOf(r) === filter);
    if (q)
      out = out.filter((r) =>
        [r.name, r.email, r.phone, r.code, r.side, r.guest_group].some((v) => (v ?? "").toLowerCase().includes(q))
      );
    return out;
  }, [rows, filter, search]);

  const counts = useMemo(
    () => ({
      invitations: rows.length,
      people: rows.reduce((n, r) => n + toParty(r.max_additional), 0),
      noContact: rows.filter((r) => r.send_via !== "in_person" && !r.email && !r.phone).length,
      sent: rows.filter((r) => r.sent_at).length,
      opened: rows.filter((r) => r.opened_at).length,
      responded: rows.filter((r) => r.responded_at || r.guest).length,
      comingPeople: rows.reduce(
        (n, r) => n + (r.guest && r.guest.status !== "declined" ? r.guest.party_size : 0),
        0
      ),
    }),
    [rows]
  );

  const handleAdd = async () => {
    if (!draft.name.trim()) return;
    setBusy(true);
    try {
      const created = await addInvitation(draft);
      setRows((p) => [created, ...p]);
      // Keep the choices that tend to repeat down a list.
      setDraft({ ...blank(), party: draft.party, sendVia: draft.sendVia, side: draft.side, group: draft.group });
      toast(`Added ${created.name} · code ${created.code}`, "success");
    } catch {
      toast("Couldn't add that invitation.", "error");
    }
    setBusy(false);
  };

  const startEdit = (r: Invitation) => {
    setOpenId(null);
    setEditingId(r.id);
    setEdit(detailsOf(r));
  };

  const saveEdit = async () => {
    const target = rows.find((r) => r.id === editingId);
    if (!target) return;
    setBusy(true);
    try {
      await updateInvitation(target.id, edit);
      patch(target.id, {
        name: edit.name.trim() || target.name,
        email: edit.email.trim() || null,
        phone: edit.phone.trim() || null,
        send_via: edit.sendVia || null,
        side: edit.side || null,
        guest_group: edit.group || null,
        notes: edit.notes.trim() || null,
        max_additional: toAdditional(edit.party),
      });
      setEditingId(null);
    } catch {
      toast("Couldn't save those changes.", "error");
    }
    setBusy(false);
  };

  const handleDelete = async (row: Invitation) => {
    const extra = row.guest ? "\n\nTheir RSVP stays in the guest list, without an invitation." : "";
    if (!confirm(`Delete the invitation for ${row.name}?\n\nTheir link (${row.code}) will stop working.${extra}`))
      return;
    try {
      await deleteInvitation(row.id);
      setRows((p) => p.filter((r) => r.id !== row.id));
    } catch {
      toast("Couldn't delete that invitation.", "error");
    }
  };

  const setSent = async (r: Invitation, sent: boolean) => {
    try {
      await markSent([r.id], sent);
      patch(r.id, { sent_at: sent ? r.sent_at ?? new Date().toISOString() : null });
    } catch {
      toast("Couldn't update.", "error");
    }
  };

  const openChannel = (r: Invitation, channel: Channel, kind: MessageKind = "invite") => {
    const m = inviteMessage(r, kind);
    const url = channel === "whatsapp" ? whatsappUrl(r.phone, m.whatsapp) : gmailUrl(r.email, m.subject, m.email);
    window.open(url, "_blank", "noopener");
  };

  const finished = async (r: Invitation, kind: MessageKind) => {
    if (kind === "reminder") setReminded(markReminded(r.id));
    else await setSent(r, true);
  };

  /** From a list row: open the app and record it straight away. */
  const sendFromRow = async (r: Invitation, channel: Channel) => {
    openChannel(r, channel);
    if (!r.sent_at) {
      await setSent(r, true);
      toast(`${r.name} marked as sent. If it didn't go, use Edit to unmark it.`, "success");
    }
  };

  const remindFromRow = (r: Invitation) => {
    openChannel(r, channelsFor(r).whatsapp ? "whatsapp" : "email", "reminder");
    setReminded(markReminded(r.id));
  };

  const reopen = async (r: Invitation) => {
    if (!r.guest) return;
    if (!confirm(`Delete ${r.name}'s RSVP so they can answer again?\n\nTheir link (${r.code}) will work one more time. What they sent before is removed.`))
      return;
    try {
      await reopenInvitation(r.guest.id);
      await load();
      toast(`${r.name} can RSVP again.`, "success");
    } catch {
      toast("Couldn't reopen that invitation.", "error");
    }
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${label} copied.`, "success");
    } catch {
      toast("Couldn't copy to the clipboard.", "error");
    }
  };

  const markAllSent = async () => {
    const ids = rows.filter((r) => !r.sent_at && (r.email || r.phone)).map((r) => r.id);
    if (!ids.length) return toast("Nothing to mark: everything with contact details is already sent.", "success");
    if (!confirm(`Mark ${ids.length} invitation(s) as sent?\n\nDo this after they have actually gone out, e.g. after the Gmail mail merge.`)) return;
    try {
      await markSent(ids);
      await load();
      toast(`Marked ${ids.length} as sent.`, "success");
    } catch {
      toast("Couldn't update.", "error");
    }
  };

  // ── Pieces shared by the table and the phone cards ────────

  const statusPill = (r: Invitation) => {
    const status = statusOf(r);
    return (
      <span className="min-w-0">
        <span className={`inline-block text-[10px] tracking-[1px] uppercase px-2 py-0.5 border rounded-sm ${STATUS_STYLE[status]}`}>
          {status === "responded" ? "replied" : status}
        </span>
        {needsReminder(r) && reminded[r.id] && (
          <span className="block text-[10px] text-white/35 mt-0.5">reminded {fmtDate(reminded[r.id])}</span>
        )}
      </span>
    );
  };

  const contact = (r: Invitation) => {
    const phoneIssue = phoneProblem(r.phone);
    return (
      <>
        {r.phone && (
          <span className={`block truncate ${phoneIssue ? "text-[#E9C46A]/80" : "text-white/60"}`} title={phoneIssue ?? r.phone}>
            {r.phone}{phoneIssue && " ⚠"}
          </span>
        )}
        {r.email && <span className="block truncate text-white/55" title={r.email}>{r.email}</span>}
        {!r.phone && !r.email && (
          <span className={r.send_via === "in_person" ? "text-white/40" : "text-[#E9C46A]/70"}>
            {r.send_via === "in_person" ? "In person" : "No contact"}
          </span>
        )}
      </>
    );
  };

  const reply = (r: Invitation) =>
    r.guest ? (
      <button onClick={() => setOpenId(openId === r.id ? null : r.id)} className="text-left w-full min-w-0" title="Show what they answered">
        <span className={r.guest.status === "declined" ? "text-rose/80" : "text-[#8FBF7F]"}>
          {r.guest.status === "declined" ? "Can't make it" : `Coming, party of ${r.guest.party_size}`}
        </span>
        <span className="block text-[11px] text-white/35 truncate">{openId === r.id ? "hide details" : "show details"}</span>
      </button>
    ) : (
      <span className="text-white/30">no reply yet</span>
    );

  const actions = (r: Invitation) => {
    const channels = channelsFor(r);
    const editing = editingId === r.id;
    return (
      <>
        {needsReminder(r) && (channels.whatsapp || channels.email) && (
          <button onClick={() => remindFromRow(r)} className={`${smallButton} text-[#E9C46A]/85 hover:text-[#E9C46A]`}
            title={channels.whatsapp ? "Send a reminder on WhatsApp" : "Send a reminder in Gmail"}>
            Remind
          </button>
        )}
        {channels.whatsapp && (
          <button onClick={() => sendFromRow(r, "whatsapp")} className={`${smallButton} text-[#5FCB8A]/85 hover:text-[#5FCB8A]`}
            title={r.sent_at ? "Send the invitation again on WhatsApp" : "Send on WhatsApp"}>
            WhatsApp
          </button>
        )}
        {channels.email && (
          <button onClick={() => sendFromRow(r, "email")} className={smallButton}
            title={r.sent_at ? "Send the invitation again in Gmail" : "Send in Gmail"}>
            Gmail
          </button>
        )}
        <button onClick={() => copy(inviteUrl(r.code), "Link")} className={smallButton}>Link</button>
        <button onClick={() => (editing ? setEditingId(null) : startEdit(r))} className={smallButton}>
          {editing ? "Close" : "Edit"}
        </button>
        <button onClick={() => handleDelete(r)} title="Delete" aria-label={`Delete ${r.name}`} className="text-white/45 hover:text-rose transition-colors duration-200">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </>
    );
  };

  const editPanel = (r: Invitation) => (
    <div>
      <DetailsFields value={edit} onChange={setEdit} onEnter={saveEdit} autoFocus />
      <input className={`${input} mt-2`} placeholder="Private note (never shown to the guest)" value={edit.notes}
        onChange={(e) => setEdit({ ...edit, notes: e.target.value })}
        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }} />
      <div className="flex flex-wrap items-center gap-4 mt-3">
        <button onClick={saveEdit} disabled={busy}
          className="text-[11px] font-semibold tracking-[1.5px] uppercase text-white bg-accent px-5 py-2 rounded-sm hover:bg-accent-hover disabled:opacity-40">
          Save
        </button>
        <button onClick={() => setEditingId(null)} className="text-[11px] tracking-[1.5px] uppercase text-white/45 hover:text-white/70">
          Cancel
        </button>
        {r.sent_at && (
          <button onClick={() => setSent(r, false)} className={`${smallButton} ml-auto`}>
            Mark as not sent
          </button>
        )}
      </div>
    </div>
  );

  const replyPanel = (r: Invitation) =>
    r.guest && (
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] text-[12px]">
        <div>
          <p className="text-[10px] tracking-[1px] uppercase text-white/40 mb-1.5">Replied as</p>
          <p className="text-cream/85">{r.guest.name}</p>
          {r.guest.email && <p className="text-white/50">{r.guest.email}</p>}
          <p className="text-white/40 mt-1">
            {new Date(r.guest.created_at).toLocaleDateString()} · RSVP-{String(r.guest.rsvp_seq).padStart(3, "0")}
          </p>
          {r.guest.name.trim().toLowerCase() !== r.name.trim().toLowerCase() && (
            <p className="text-[#E9C46A]/70 mt-1">Invited as "{r.name}", replied as "{r.guest.name}"</p>
          )}
        </div>
        <div>
          <p className="text-[10px] tracking-[1px] uppercase text-white/40 mb-1.5">Everyone coming</p>
          <ul className="space-y-1">
            <li className="text-cream/85">{r.guest.name}</li>
            {r.guest.plus_ones.map((po, i) => (
              <li key={i} className="text-white/70"><span className="text-accent/50">↳</span> {po.name}</li>
            ))}
          </ul>
          <p className="text-white/35 mt-1.5">Dietary, songs and tables are in the Guest list.</p>
        </div>
        <div>
          <button onClick={() => reopen(r)}
            className="text-[10px] tracking-[1.5px] uppercase text-rose/85 hover:text-rose border border-rose/30 hover:border-rose/60 px-3 py-1.5 rounded-sm transition-colors duration-200 whitespace-nowrap">
            Delete RSVP and reopen link
          </button>
        </div>
      </div>
    );

  if (loading)
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center text-white/50 text-sm">Loading…</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {[
          ["Invitations", counts.invitations],
          ["People invited", counts.people],
          ["Sent", counts.sent],
          ["Opened link", counts.opened],
          ["Replied", counts.responded],
          ["Coming", counts.comingPeople],
        ].map(([label, n]) => (
          <div key={String(label)} className="border border-white/[0.07] rounded-sm px-4 py-3">
            <p className="text-[10px] tracking-[2px] uppercase text-white/40 mb-1">{label}</p>
            <p className="font-serif text-2xl tabular-nums">{n}</p>
          </div>
        ))}
      </div>

      {counts.noContact > 0 && (
        <p className="text-[12px] text-[#E9C46A]/80 font-light mb-6 -mt-4">
          {counts.noContact} invitation{counts.noContact === 1 ? " has" : "s have"} no phone number or email yet, so{" "}
          {counts.noContact === 1 ? "it" : "they"} can't be sent. Use Edit to add one.
        </p>
      )}

      {/* Send / import / add */}
      <div className="border border-white/[0.07] rounded-sm mb-8">
        <div className="flex overflow-x-auto border-b border-white/[0.07]">
          {([
            ["send", "Send & remind"],
            ["import", "Import spreadsheet"],
            ["add", "Add one"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPanel(key)}
              className={`px-4 py-3 text-[11px] tracking-[1.5px] uppercase whitespace-nowrap transition-colors duration-200 border-b-2 -mb-px ${
                panel === key ? "text-cream border-accent" : "text-white/45 border-transparent hover:text-white/75"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="p-4">
          {panel === "send" && <SendPanel rows={rows} reminded={reminded} onOpen={openChannel} onDone={finished} />}
          {panel === "import" && (
            <ImportPanel existing={rows} onImported={(added) => { setRows((p) => [...added, ...p]); if (added.length) setPanel("send"); }} />
          )}
          {panel === "add" && (
            <>
              <DetailsFields value={draft} onChange={setDraft} onEnter={handleAdd} />
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <button
                  onClick={handleAdd}
                  disabled={busy || !draft.name.trim()}
                  className="text-[11px] font-semibold tracking-[2px] uppercase text-white bg-accent px-6 py-2.5 rounded-sm transition-all duration-300 hover:bg-accent-hover disabled:opacity-30"
                >
                  Add invitation
                </button>
                <p className="text-[11px] text-white/35 font-light">
                  "Just them" is an invitation for one. "Party of 2" lets them add one guest when they RSVP, and never more.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filters, search, exports */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="flex gap-1 flex-wrap">
          {(["all", "unsent", "sent", "opened", "responded", "no-reply"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[10px] tracking-[1.5px] uppercase rounded-sm transition-all duration-200 ${
                filter === f ? "bg-white/[0.07] text-cream" : "text-white/50 hover:text-white/75"
              }`}
            >
              {f === "no-reply" ? "Sent, no reply" : f === "responded" ? "replied" : f}
            </button>
          ))}
        </div>
        <input
          className={`${input} sm:w-60 lg:ml-auto`}
          placeholder="Search name, phone, email, code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={() => downloadFile("invitations.csv", invitationsCsv(rows))}
          className="text-[11px] tracking-[1.5px] uppercase text-white/70 hover:text-cream border border-white/15 px-4 py-2 rounded-sm transition-colors duration-200 whitespace-nowrap">
          Download CSV
        </button>
        <button onClick={markAllSent}
          className="text-[11px] tracking-[1.5px] uppercase text-white/70 hover:text-cream border border-white/15 px-4 py-2 rounded-sm transition-colors duration-200 whitespace-nowrap">
          Mark all as sent
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-white/[0.07] rounded-sm py-16 text-center text-white/40 text-sm">
          {rows.length === 0
            ? "No invitations yet. Import your spreadsheet or add one above."
            : "Nothing matches that filter or search."}
        </div>
      ) : (
        <>
          {/* Desktop and tablet: the table */}
          <div className="hidden md:block border border-white/[0.07] rounded-sm overflow-x-auto">
            <div className="min-w-[1100px]">
              <div className={`${COLS} px-4 py-2.5 bg-white/[0.03] text-[10px] tracking-[1px] uppercase text-white/40`}>
                <span>Guest</span>
                <span>Contact</span>
                <span>Code</span>
                <span className="text-center">Party</span>
                <span>Status</span>
                <span>Their reply</span>
                <span className="text-right">Actions</span>
              </div>

              {filtered.map((r) => (
                <div key={r.id} className={`${COLS} px-4 py-3 border-t border-white/[0.05] items-center text-[13px]`}>
                  <span className="min-w-0">
                    <span className="block truncate text-cream/85 font-light" title={r.name}>{r.name}</span>
                    {(r.side || r.guest_group) && (
                      <span className="block truncate text-[11px] text-white/40">{[r.side, r.guest_group].filter(Boolean).join(" · ")}</span>
                    )}
                  </span>
                  <span className="min-w-0 text-[12px] font-light">{contact(r)}</span>
                  <button onClick={() => copy(r.code, "Code")} title="Copy code"
                    className="font-mono text-accent/85 hover:text-accent text-left transition-colors duration-200">
                    {r.code}
                  </button>
                  <span className="text-white/60 tabular-nums text-center">{toParty(r.max_additional)}</span>
                  {statusPill(r)}
                  <div className="min-w-0">{reply(r)}</div>
                  <div className="flex items-center gap-3 justify-end whitespace-nowrap">{actions(r)}</div>

                  {editingId === r.id && <div className="col-span-full mt-2 pt-3 border-t border-white/[0.05]">{editPanel(r)}</div>}
                  {editingId !== r.id && r.guest && openId === r.id && (
                    <div className="col-span-full mt-2 pt-3 border-t border-white/[0.05]">{replyPanel(r)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Phones: cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((r) => (
              <div key={r.id} className="border border-white/[0.08] rounded-sm p-3 text-[13px]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] text-cream/90">{r.name}</p>
                    <p className="text-[11px] text-white/40">
                      {[`Party of ${toParty(r.max_additional)}`, r.code, r.side, r.guest_group].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {statusPill(r)}
                </div>
                <div className="mt-2 text-[12px] font-light">{contact(r)}</div>
                <div className="mt-2 text-[12px]">{reply(r)}</div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 pt-2.5 border-t border-white/[0.06]">{actions(r)}</div>
                {editingId === r.id && <div className="mt-3 pt-3 border-t border-white/[0.06]">{editPanel(r)}</div>}
                {editingId !== r.id && r.guest && openId === r.id && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06]">{replyPanel(r)}</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
