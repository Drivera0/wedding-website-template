import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../Toast";
import {
  deleteGuest,
  fetchGuests,
  setTable,
  updateGuestNotes,
  updateGuestStatus,
  type Guest,
  type GuestStatus,
} from "../../lib/supabase";
import {
  SEND_VIA_LABEL,
  downloadFile,
  expectedPlusOnes,
  listInvitations,
  reopenInvitation,
  toParty,
  type Invitation,
} from "../../lib/invitations";

// ============================================================
//  GUEST LIST
// ============================================================
//  Everyone, one row per person. Every plus one has its own row, badged and
//  labelled with the main guest it came with.
//
//  Two views: "By invitation" keeps each party together under its main
//  guest; "Everyone A–Z" lists every person alphabetically.
//
//  Invitations nobody has answered yet are included too: the main guest, any
//  plus ones named in the imported spreadsheet (shown as Expected), and a line
//  for places not named yet. So this is the whole list, not only the replies.
// ============================================================

type Status = "coming" | "declined" | "maybe" | "waiting";
type Filter = "all" | "coming" | "waiting" | "declined";
type View = "grouped" | "az";
/** main guest / confirmed plus one / plus one named in the spreadsheet only */
type Kind = "main" | "plus" | "expected";

const STATUS_LABEL: Record<Status, string> = {
  coming: "Coming",
  declined: "Can't come",
  maybe: "Maybe",
  waiting: "No reply",
};

const STATUS_STYLE: Record<Status, string> = {
  coming: "text-[#8FBF7F] border-[#8FBF7F]/40 bg-[#8FBF7F]/10",
  declined: "text-rose border-rose/40 bg-rose/10",
  maybe: "text-[#E9C46A] border-[#E9C46A]/40 bg-[#E9C46A]/10",
  waiting: "text-white/55 border-white/15",
};

const toStatus = (s: GuestStatus): Status =>
  s === "confirmed" ? "coming" : s === "declined" ? "declined" : "maybe";
const toGuestStatus: Record<Exclude<Status, "waiting">, GuestStatus> = {
  coming: "confirmed",
  maybe: "pending",
  declined: "declined",
};

interface Person {
  key: string;
  /** Guest or plus one id, for seating. Null for people who haven't RSVP'd. */
  id: string | null;
  name: string;
  kind: Kind;
  dietary: string[];
  dietaryOther: string | null;
  song: string | null;
  table: string | null;
}

interface Party {
  key: string;
  name: string;
  status: Status;
  invitation: Invitation | null;
  guest: Guest | null;
  people: Person[];
  /** Places on the invitation. Null for an old RSVP made without one. */
  invited: number | null;
  /** Places not filled: not yet named, or left unused when they accepted. */
  openPlaces: number;
  email: string | null;
  phone: string | null;
  side: string | null;
  group: string | null;
}

interface Row {
  party: Party;
  person: Person;
}

const NO_TABLE = "__none";

function peopleOf(g: Guest): Person[] {
  return [
    {
      key: g.id,
      id: g.id,
      name: g.name,
      kind: "main",
      dietary: g.guest_dietary.filter((gd) => gd.guest_id === g.id).map((gd) => gd.dietary_options.name),
      dietaryOther: g.dietary_restrictions,
      song: g.song_request,
      table: g.table_name,
    },
    ...g.plus_ones.map((po) => ({
      key: po.id,
      id: po.id,
      name: po.name,
      kind: "plus" as const,
      dietary: (po.guest_dietary ?? []).map((gd) => gd.dietary_options.name),
      dietaryOther: po.dietary_restrictions,
      song: po.song_request,
      table: po.table_name,
    })),
  ];
}

function buildParties(guests: Guest[], invitations: Invitation[]): Party[] {
  const byId = new Map(guests.map((g) => [g.id, g]));
  const linked = new Set<string>();

  const parties: Party[] = invitations.map((inv) => {
    const guest = inv.guest_id ? byId.get(inv.guest_id) ?? null : null;
    if (guest) linked.add(guest.id);
    const invited = toParty(inv.max_additional);
    const status: Status = guest ? toStatus(guest.status) : "waiting";
    const blank = { id: null, dietary: [], dietaryOther: null, song: null, table: null };
    const people: Person[] = guest
      ? peopleOf(guest)
      : [
          { ...blank, key: inv.id, name: inv.name, kind: "main" },
          ...expectedPlusOnes(inv.notes)
            .slice(0, inv.max_additional)
            .map((name, i) => ({ ...blank, key: `${inv.id}-expected-${i}`, name, kind: "expected" as const })),
        ];
    return {
      key: inv.id,
      name: inv.name,
      status,
      invitation: inv,
      guest,
      people,
      invited,
      openPlaces: status === "declined" ? 0 : Math.max(0, invited - people.length),
      email: guest?.email || inv.email,
      phone: inv.phone ?? guest?.phone ?? null,
      side: inv.side,
      group: inv.guest_group,
    };
  });

  // RSVPs from before every guest needed an invitation.
  for (const guest of guests) {
    if (linked.has(guest.id)) continue;
    parties.push({
      key: guest.id,
      name: guest.name,
      status: toStatus(guest.status),
      invitation: null,
      guest,
      people: peopleOf(guest),
      invited: null,
      openPlaces: 0,
      email: guest.email,
      phone: guest.phone,
      side: null,
      group: null,
    });
  }

  return parties.sort((a, b) => a.name.localeCompare(b.name));
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null;

// One grid for the header and every row, so the columns cannot drift apart.
const COLS =
  "grid grid-cols-[36px_minmax(0,1.6fr)_96px_minmax(0,0.9fr)_88px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-3";

const KIND_BADGE: Record<Kind, string> = {
  main: "text-white/55 border-white/15",
  plus: "text-accent border-accent/40 bg-accent/10",
  expected: "text-white/45 border-white/20 border-dashed",
};
const KIND_LABEL: Record<Kind, string> = { main: "Main guest", plus: "Plus one", expected: "Expected" };

function Badge({ kind }: { kind: Kind }) {
  return (
    <span className={`shrink-0 text-[9px] tracking-[1px] uppercase px-1.5 py-px border rounded-sm ${KIND_BADGE[kind]}`}>
      {KIND_LABEL[kind]}
    </span>
  );
}

function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`inline-block text-[10px] tracking-[1px] uppercase px-2 py-0.5 border rounded-sm whitespace-nowrap ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function DietTags({ person }: { person: Person }) {
  if (!person.dietary.length && !person.dietaryOther) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {person.dietary.map((t) => (
        <span key={t} className="text-[11px] px-1.5 py-0.5 bg-accent/12 text-accent/85 rounded-sm">{t}</span>
      ))}
      {person.dietaryOther && (
        <span className="text-[11px] px-1.5 py-0.5 bg-white/[0.06] text-white/75 rounded-sm">{person.dietaryOther}</span>
      )}
    </span>
  );
}

export default function GuestListTab() {
  const { toast } = useToast();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("grouped");
  const [filter, setFilter] = useState<Filter>("all");
  const [side, setSide] = useState("");
  const [group, setGroup] = useState("");
  const [table, setTableFilter] = useState("");
  const [search, setSearch] = useState("");
  /** The row whose details are open, by person key. */
  const [openRow, setOpenRow] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [g, i] = await Promise.all([fetchGuests(), listInvitations()]);
      setGuests(g);
      setInvitations(i);
    } catch {
      toast("Couldn't load the guest list.", "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const parties = useMemo(() => buildParties(guests, invitations), [guests, invitations]);

  const stats = useMemo(() => {
    let invited = 0, coming = 0, waiting = 0, declined = 0, unused = 0, notSent = 0, seated = 0;
    for (const p of parties) {
      const size = p.invited ?? p.people.length;
      invited += size;
      if (p.status === "coming") {
        coming += p.people.length;
        unused += p.openPlaces;
        seated += p.people.filter((x) => x.table).length;
      } else if (p.status === "declined") declined += size;
      else waiting += size;
      if (p.invitation && !p.guest && !p.invitation.sent_at) notSent++;
    }
    return { invited, coming, waiting, declined, unused, notSent, seated };
  }, [parties]);

  const sides = useMemo(() => [...new Set(parties.map((p) => p.side).filter(Boolean))] as string[], [parties]);
  const groups = useMemo(() => [...new Set(parties.map((p) => p.group).filter(Boolean))] as string[], [parties]);
  const tables = useMemo(
    () =>
      [...new Set(parties.flatMap((p) => p.people.map((x) => x.table)).filter(Boolean))].sort((a, b) =>
        (a as string).localeCompare(b as string, undefined, { numeric: true })
      ) as string[],
    [parties]
  );

  /** Parties matching the filters, each with only its matching people. */
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const personMatchesTable = (x: Person) =>
      !table || (table === NO_TABLE ? Boolean(x.id) && !x.table : x.table === table);

    return parties
      .filter((p) => {
        if (filter === "coming" && p.status !== "coming") return false;
        if (filter === "declined" && p.status !== "declined") return false;
        if (filter === "waiting" && p.status !== "waiting" && p.status !== "maybe") return false;
        if (side && p.side !== side) return false;
        if (group && p.group !== group) return false;
        if (!q) return true;
        return [p.name, p.email, p.phone, p.invitation?.code, ...p.people.map((x) => x.name)].some((v) =>
          (v ?? "").toLowerCase().includes(q)
        );
      })
      .map((p) => ({ ...p, people: p.people.filter(personMatchesTable) }))
      .filter((p) => p.people.length > 0);
  }, [parties, filter, side, group, table, search]);

  const rows: Row[] = useMemo(() => {
    const all = visible.flatMap((party) => party.people.map((person) => ({ party, person })));
    return view === "az" ? all.sort((a, b) => a.person.name.localeCompare(b.person.name)) : all;
  }, [visible, view]);

  const setStatus = async (p: Party, status: Exclude<Status, "waiting">) => {
    if (!p.guest) return;
    try {
      await updateGuestStatus(p.guest.id, toGuestStatus[status]);
      const id = p.guest.id;
      setGuests((prev) => prev.map((g) => (g.id === id ? { ...g, status: toGuestStatus[status] } : g)));
    } catch {
      toast("Couldn't change the status.", "error");
    }
  };

  const saveNotes = async (p: Party, notes: string) => {
    if (!p.guest || (p.guest.notes ?? "") === notes.trim()) return;
    try {
      await updateGuestNotes(p.guest.id, notes);
      const id = p.guest.id;
      setGuests((prev) => prev.map((g) => (g.id === id ? { ...g, notes: notes.trim() || null } : g)));
    } catch {
      toast("Couldn't save the note.", "error");
    }
  };

  const saveTable = async (person: Person, value: string) => {
    const next = value.trim();
    if (!person.id || (person.table ?? "") === next) return;
    const id = person.id;
    try {
      await setTable(id, next);
      const table_name = next || null;
      setGuests((prev) =>
        prev.map((g) =>
          g.id === id
            ? { ...g, table_name }
            : { ...g, plus_ones: g.plus_ones.map((po) => (po.id === id ? { ...po, table_name } : po)) }
        )
      );
    } catch {
      toast("Couldn't save the table.", "error");
    }
  };

  const removeResponse = async (p: Party) => {
    if (!p.guest) return;
    const message = p.invitation
      ? `Delete ${p.name}'s RSVP so they can answer again?\n\nTheir link (${p.invitation.code}) will work one more time. What they sent before, including their guests' names and tables, is removed.`
      : `Delete ${p.name}'s RSVP? This cannot be undone.`;
    if (!confirm(message)) return;
    try {
      if (p.invitation) await reopenInvitation(p.guest.id);
      else await deleteGuest(p.guest.id);
      setOpenRow(null);
      await load();
      toast(p.invitation ? `${p.name} can RSVP again.` : "RSVP deleted.", "success");
    } catch {
      toast("Couldn't delete that RSVP.", "error");
    }
  };

  const exportCsv = () => {
    const esc = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["Name", "Role", "Main guest", "Status", "Party size", "Table", "Dietary", "Song", "Email", "Phone", "Side", "Group", "Code", "Notes"];
    const lines = rows.map(({ party: p, person }) =>
      [
        person.name,
        KIND_LABEL[person.kind],
        person.kind === "main" ? "" : p.name,
        STATUS_LABEL[p.status],
        person.kind === "main" ? p.invited ?? p.people.length : "",
        person.table,
        [...person.dietary, person.dietaryOther].filter(Boolean).join("; "),
        person.song,
        person.kind === "main" ? p.email : "",
        person.kind === "main" ? p.phone : "",
        p.side,
        p.group,
        p.invitation?.code,
        person.kind === "main" ? p.guest?.notes : "",
      ].map(esc).join(",")
    );
    downloadFile("guest-list.csv", [header.join(","), ...lines].join("\n"));
  };

  const toggle = (row: Row) => {
    const key = row.person.key;
    setOpenRow((cur) => (cur === key ? null : key));
  };

  // ── Pieces shared by the table and the phone cards ────────

  const tableInput = ({ party, person }: Row, compact = false) =>
    person.id && party.status !== "declined" ? (
      <input
        key={`${person.id}-${person.table ?? ""}`}
        defaultValue={person.table ?? ""}
        placeholder="Table"
        aria-label={`Table for ${person.name}`}
        onClick={(e) => e.stopPropagation()}
        onBlur={(e) => saveTable(person, e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        className={`${compact ? "w-16" : "w-full"} min-w-0 py-1 px-2 bg-transparent border border-white/[0.08] rounded-sm text-[12px] text-cream/85 placeholder:text-white/25 focus:border-accent/40 outline-none`}
      />
    ) : null;

  const nameCell = ({ party, person }: Row, flat: boolean) =>
    person.kind === "main" ? (
      <span className="min-w-0 block">
        <span className="flex items-center gap-2 min-w-0">
          <span className="truncate text-cream/90" title={person.name}>{person.name}</span>
          {(flat || party.people.length > 1 || party.openPlaces > 0) && <Badge kind="main" />}
        </span>
        {(party.side || party.group) && (
          <span className="block text-[11px] text-white/40 truncate">{[party.side, party.group].filter(Boolean).join(" · ")}</span>
        )}
      </span>
    ) : (
      <span className="min-w-0 block">
        <span className="flex items-center gap-2 min-w-0">
          {!flat && <span className="text-accent/60 shrink-0">↳</span>}
          <span className={`truncate ${person.kind === "expected" ? "text-white/55 italic" : "text-white/85"}`} title={person.name}>
            {person.name}
          </span>
          <Badge kind={person.kind} />
        </span>
        <span className={`block text-[11px] text-white/40 truncate ${flat ? "" : "pl-4"}`}>
          {person.kind === "plus" ? `with ${party.name}` : `with ${party.name}, from your spreadsheet`}
        </span>
      </span>
    );

  const details = (p: Party) => (
    <div className="grid gap-6 md:grid-cols-3 text-[12px]">
      <div>
        <p className="text-[10px] tracking-[1px] uppercase text-white/40 mb-1.5">Invitation</p>
        {p.invitation ? (
          <dl className="grid grid-cols-[88px_1fr] gap-y-1 text-white/60">
            <dt className="text-white/35">Code</dt><dd className="font-mono text-accent/80">{p.invitation.code}</dd>
            <dt className="text-white/35">Places</dt><dd>{p.invited}</dd>
            <dt className="text-white/35">Send by</dt><dd>{p.invitation.send_via ? SEND_VIA_LABEL[p.invitation.send_via] : "Not set"}</dd>
            <dt className="text-white/35">Sent</dt><dd>{fmtDate(p.invitation.sent_at) ?? "Not yet"}</dd>
            <dt className="text-white/35">Opened link</dt><dd>{fmtDate(p.invitation.opened_at) ?? "Not yet"}</dd>
            <dt className="text-white/35">Replied</dt><dd>{fmtDate(p.guest?.created_at ?? p.invitation.responded_at) ?? "Not yet"}</dd>
          </dl>
        ) : (
          <p className="text-white/50 leading-relaxed">
            This RSVP came in before every guest needed their own invitation, so it isn't tied to one.
          </p>
        )}
        {p.invitation?.notes && <p className="text-white/50 mt-2">Note: {p.invitation.notes}</p>}
      </div>

      {p.guest ? (
        <>
          <div>
            <p className="text-[10px] tracking-[1px] uppercase text-white/40 mb-1.5">Status</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {(["coming", "maybe", "declined"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(p, s)}
                  className={`text-[10px] tracking-[1px] uppercase px-2.5 py-1 border rounded-sm transition-all duration-200 ${
                    p.status === s ? STATUS_STYLE[s] : "border-white/10 text-white/50 hover:border-white/25"
                  }`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            <p className="text-[10px] tracking-[1px] uppercase text-white/40 mb-1.5">Your notes</p>
            <textarea
              key={p.guest.id}
              defaultValue={p.guest.notes ?? ""}
              onBlur={(e) => saveNotes(p, e.target.value)}
              placeholder="Anything to remember about this party…"
              className="w-full h-16 py-1.5 px-2 bg-white/[0.03] border border-white/[0.08] text-[12px] text-white/75 font-light placeholder:text-white/30 focus:border-accent/40 outline-none rounded-sm resize-none"
            />
          </div>
          <div>
            <p className="text-[10px] tracking-[1px] uppercase text-white/40 mb-1.5">Change their answer</p>
            <p className="text-white/50 leading-relaxed mb-3">
              {p.invitation
                ? "Guests can only RSVP once. If they need to change something, delete this RSVP and their link will work one more time."
                : "Delete this RSVP."}
            </p>
            <button
              onClick={() => removeResponse(p)}
              className="text-[10px] tracking-[1.5px] uppercase text-rose/85 hover:text-rose border border-rose/30 hover:border-rose/60 px-3 py-1.5 rounded-sm transition-colors duration-200"
            >
              {p.invitation ? "Delete RSVP and reopen link" : "Delete RSVP"}
            </button>
          </div>
        </>
      ) : (
        <div className="md:col-span-2 text-white/50 leading-relaxed">
          <p className="text-[10px] tracking-[1px] uppercase text-white/40 mb-1.5">No reply yet</p>
          {p.invitation?.sent_at
            ? p.invitation.opened_at
              ? "They opened their link but haven't replied. The Reminders panel in Invitations can nudge them."
              : "Sent, but the link hasn't been opened yet."
            : "This invitation hasn't been sent. Send it from the Invitations tab."}
          {p.people.some((x) => x.kind === "expected") && (
            <p className="mt-2">Expected guests come from your spreadsheet. They're replaced by the real names once {p.name.split(/\s+/)[0]} replies.</p>
          )}
        </div>
      )}
    </div>
  );

  /** "+ 1 guest, not named yet" / "1 place not used", after a party's last row. */
  const openPlacesNote = (p: Party) =>
    p.openPlaces > 0
      ? p.status === "coming"
        ? `${p.openPlaces} ${p.openPlaces === 1 ? "place" : "places"} not used`
        : `+ ${p.openPlaces} ${p.openPlaces === 1 ? "guest" : "guests"}, not named yet`
      : null;

  const control =
    "py-2 px-3 bg-[#121212] border border-white/[0.08] text-[13px] text-cream/90 font-light placeholder:text-white/30 focus:border-accent/40 transition-colors duration-200 outline-none rounded-sm";

  if (loading)
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center text-white/50 text-sm">Loading…</div>;

  const isLastOfParty = (i: number) => view === "grouped" && (i === rows.length - 1 || rows[i + 1].party.key !== rows[i].party.key);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {[
          { label: "Invited", value: stats.invited, hint: "people, all invitations" },
          { label: "Coming", value: stats.coming, hint: `people confirmed, ${stats.seated} seated`, color: "text-[#8FBF7F]" },
          { label: "Waiting on", value: stats.waiting, hint: "people, no reply yet", color: "text-[#E9C46A]" },
          { label: "Can't come", value: stats.declined, hint: "places declined", color: "text-rose" },
          { label: "Places unused", value: stats.unused, hint: "accepted, fewer guests" },
          { label: "Not sent", value: stats.notSent, hint: "invitations still to send" },
        ].map((s) => (
          <div key={s.label} className="border border-white/[0.07] rounded-sm px-4 py-3">
            <p className="text-[10px] tracking-[2px] uppercase text-white/45 mb-1">{s.label}</p>
            <p className={`font-serif text-3xl tabular-nums leading-none ${s.color ?? "text-cream"}`}>{s.value}</p>
            <p className="text-[11px] text-white/35 font-light mt-1.5">{s.hint}</p>
          </div>
        ))}
      </div>

      {/* View + filters */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="flex border border-white/[0.1] rounded-sm overflow-hidden">
          {([["grouped", "By invitation"], ["az", "Everyone A–Z"]] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-[10px] tracking-[1.5px] uppercase transition-colors duration-200 ${
                view === v ? "bg-white/[0.1] text-cream" : "text-white/50 hover:text-white/80"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {(["all", "coming", "waiting", "declined"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[10px] tracking-[1.5px] uppercase rounded-sm transition-all duration-200 ${
                filter === f ? "bg-white/[0.08] text-cream" : "text-white/50 hover:text-white/75"
              }`}
            >
              {f === "all" ? "Everyone" : f === "waiting" ? "No reply" : STATUS_LABEL[f]}
            </button>
          ))}
        </div>
        {sides.length > 0 && (
          <select className={control} value={side} onChange={(e) => setSide(e.target.value)}>
            <option value="">All sides</option>
            {sides.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        {groups.length > 0 && (
          <select className={control} value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="">All groups</option>
            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        )}
        <select className={control} value={table} onChange={(e) => setTableFilter(e.target.value)}>
          <option value="">All tables</option>
          <option value={NO_TABLE}>Not seated</option>
          {tables.map((t) => <option key={t} value={t}>Table {t}</option>)}
        </select>
        <input
          className={`${control} w-full sm:w-56 lg:ml-auto`}
          placeholder="Search name, phone, email, code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={exportCsv}
          className="text-[11px] tracking-[1.5px] uppercase text-white/70 hover:text-cream border border-white/15 px-4 py-2 rounded-sm transition-colors duration-200 whitespace-nowrap">
          Download CSV
        </button>
        <button onClick={() => { setLoading(true); load(); }}
          className="text-[11px] tracking-[1.5px] uppercase text-white/55 hover:text-accent transition-colors duration-200">
          Refresh
        </button>
      </div>
      <p className="text-[12px] text-white/40 font-light mb-3">
        Showing {rows.length} {rows.length === 1 ? "person" : "people"} on {visible.length}{" "}
        {visible.length === 1 ? "invitation" : "invitations"}. Click a row for details. Type a table and press Enter to seat someone.
      </p>

      {rows.length === 0 ? (
        <div className="border border-white/[0.07] rounded-sm py-16 text-center text-white/40 text-sm">
          {parties.length === 0
            ? "No guests yet. Add invitations or import your spreadsheet in the Invitations tab."
            : "Nobody matches that filter or search."}
        </div>
      ) : (
        <>
          {/* Desktop and tablet: the table */}
          <div className="hidden md:block border border-white/[0.07] rounded-sm overflow-x-auto">
            <div className="min-w-[1160px]">
              <div className={`${COLS} px-4 py-2.5 bg-white/[0.03] text-[10px] tracking-[1px] uppercase text-white/45`}>
                <span>#</span>
                <span>Guest</span>
                <span>Status</span>
                <span>Invitation</span>
                <span>Table</span>
                <span>Dietary</span>
                <span>Song</span>
                <span>Contact</span>
              </div>

              {rows.map((row, i) => {
                const { party: p, person } = row;
                const firstOfParty = view === "az" || i === 0 || rows[i - 1].party.key !== p.key;
                const showPartyInfo = view === "az" || person.kind === "main";
                const note = isLastOfParty(i) ? openPlacesNote(p) : null;
                return (
                  <div key={person.key} className={firstOfParty ? "border-t border-white/[0.06]" : ""}>
                    <div
                      onClick={() => toggle(row)}
                      className={`${COLS} px-4 items-start text-[13px] cursor-pointer hover:bg-white/[0.02] ${
                        firstOfParty ? "pt-3" : "pt-1"
                      } ${note ? "pb-1" : "pb-2.5"} ${openRow === person.key ? "bg-white/[0.025]" : ""}`}
                    >
                      <span className="text-white/30 tabular-nums text-[12px] pt-px">{i + 1}</span>
                      {nameCell(row, view === "az")}
                      <span><StatusPill status={p.status} /></span>
                      <span className="min-w-0 text-white/60">
                        {showPartyInfo &&
                          (p.invitation ? (
                            <>
                              <span className="block">Party of {p.invited}</span>
                              <span className="block font-mono text-[11px] text-accent/70">{p.invitation.code}</span>
                            </>
                          ) : (
                            <span className="text-[#E9C46A]/80 text-[12px]">No invitation</span>
                          ))}
                      </span>
                      <span className="min-w-0">{tableInput(row)}</span>
                      <span className="min-w-0"><DietTags person={person} /></span>
                      <span className="min-w-0 text-[12px] text-cream/70 font-light break-words">
                        {person.song && <>♪ {person.song}</>}
                      </span>
                      <span className="min-w-0 text-[12px] text-white/55">
                        {person.kind === "main" && (
                          <>
                            {p.phone && <span className="block truncate" title={p.phone}>{p.phone}</span>}
                            {p.email && <span className="block truncate" title={p.email}>{p.email}</span>}
                            {!p.phone && !p.email && <span className="text-white/25">No contact</span>}
                          </>
                        )}
                      </span>
                    </div>
                    {note && (
                      <div className={`${COLS} px-4 pb-2.5 text-[12px] text-white/35 italic`}>
                        <span />
                        <span className="pl-4">{note}</span>
                      </div>
                    )}
                    {openRow === person.key && (
                      <div className="mx-4 mb-4 mt-1 pt-3 border-t border-white/[0.06]">{details(p)}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Phones: cards */}
          <div className="md:hidden space-y-2">
            {view === "grouped"
              ? visible.map((p) => {
                  const open = p.people.some((x) => x.key === openRow);
                  const note = openPlacesNote(p);
                  return (
                    <div key={p.key} className="border border-white/[0.08] rounded-sm p-3">
                      <button onClick={() => setOpenRow(open ? null : p.people[0].key)} className="w-full text-left">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-[15px] text-cream/90">{p.name}</span>
                          <StatusPill status={p.status} />
                        </div>
                        <p className="text-[11px] text-white/40 mt-0.5">
                          {[p.invitation ? `Party of ${p.invited}` : "No invitation", p.invitation?.code, p.side, p.group].filter(Boolean).join(" · ")}
                        </p>
                      </button>
                      <ul className="mt-2.5 space-y-2">
                        {p.people.map((person) => (
                          <li key={person.key} className="flex items-start justify-between gap-3">
                            <div className="min-w-0 text-[13px]">
                              {nameCell({ party: p, person }, false)}
                              <div className="mt-1 space-y-1">
                                <DietTags person={person} />
                                {person.song && <p className="text-[12px] text-cream/65">♪ {person.song}</p>}
                              </div>
                            </div>
                            {tableInput({ party: p, person }, true)}
                          </li>
                        ))}
                      </ul>
                      {note && <p className="text-[12px] text-white/35 italic mt-2 pl-4">{note}</p>}
                      {open && <div className="mt-3 pt-3 border-t border-white/[0.06]">{details(p)}</div>}
                    </div>
                  );
                })
              : rows.map((row) => (
                  <div key={row.person.key} className="border border-white/[0.08] rounded-sm p-3">
                    <button onClick={() => toggle(row)} className="w-full text-left flex items-start justify-between gap-3">
                      <span className="min-w-0 text-[14px]">{nameCell(row, true)}</span>
                      <StatusPill status={row.party.status} />
                    </button>
                    <div className="flex items-end justify-between gap-3 mt-2">
                      <div className="space-y-1 min-w-0">
                        <DietTags person={row.person} />
                        {row.person.song && <p className="text-[12px] text-cream/65">♪ {row.person.song}</p>}
                      </div>
                      {tableInput(row, true)}
                    </div>
                    {openRow === row.person.key && <div className="mt-3 pt-3 border-t border-white/[0.06]">{details(row.party)}</div>}
                  </div>
                ))}
          </div>
        </>
      )}
    </div>
  );
}
