import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../Toast";
import { fetchGuests, type Guest } from "../../lib/supabase";
import { downloadFile } from "../../lib/invitations";

// ============================================================
//  SUMMARY
// ============================================================
//  What the venue, the caterer and the DJ need, for the people who are
//  coming: dietary counts, song requests and the seating plan, each with a
//  CSV to hand over. Only confirmed RSVPs count here.
// ============================================================

interface Person {
  id: string;
  name: string;
  mainName: string;
  isMain: boolean;
  dietary: string[];
  other: string | null;
  song: string | null;
  table: string | null;
}

function comingPeople(guests: Guest[]): Person[] {
  return guests
    .filter((g) => g.status === "confirmed")
    .flatMap((g) => [
      {
        id: g.id,
        name: g.name,
        mainName: g.name,
        isMain: true,
        dietary: g.guest_dietary.filter((gd) => gd.guest_id === g.id).map((gd) => gd.dietary_options.name),
        other: g.dietary_restrictions,
        song: g.song_request,
        table: g.table_name,
      },
      ...g.plus_ones.map((po) => ({
        id: po.id,
        name: po.name,
        mainName: g.name,
        isMain: false,
        dietary: (po.guest_dietary ?? []).map((gd) => gd.dietary_options.name),
        other: po.dietary_restrictions,
        song: po.song_request,
        table: po.table_name,
      })),
    ]);
}

const esc = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const csv = (header: string[], rows: (string | number | null | undefined)[][]) =>
  [header.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");

const byTable = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

function Card({ title, subtitle, action, children }: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-white/[0.07] rounded-sm p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-serif text-2xl text-cream">{title}</h2>
          <p className="text-[12px] text-white/45 font-light mt-0.5">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const downloadButton =
  "text-[10px] tracking-[1.5px] uppercase text-white/70 hover:text-cream border border-white/15 px-3 py-2 rounded-sm transition-colors duration-200 whitespace-nowrap";

const ofMain = (p: Person) => (p.isMain ? "" : ` (with ${p.mainName})`);

export default function SummaryTab() {
  const { toast } = useToast();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setGuests(await fetchGuests());
    } catch {
      toast("Couldn't load the summary.", "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const people = useMemo(() => comingPeople(guests), [guests]);

  const dietary = useMemo(() => {
    const byOption = new Map<string, Person[]>();
    for (const p of people) for (const d of p.dietary) byOption.set(d, [...(byOption.get(d) ?? []), p]);
    return {
      options: [...byOption.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])),
      others: people.filter((p) => p.other),
      none: people.filter((p) => !p.dietary.length && !p.other).length,
    };
  }, [people]);

  const songs = useMemo(() => people.filter((p) => p.song), [people]);

  const tables = useMemo(() => {
    const map = new Map<string, Person[]>();
    for (const p of people) if (p.table) map.set(p.table, [...(map.get(p.table) ?? []), p]);
    return {
      list: [...map.entries()].sort((a, b) => byTable(a[0], b[0])),
      unseated: people.filter((p) => !p.table),
    };
  }, [people]);

  if (loading)
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center text-white/50 text-sm">Loading…</div>;

  const withNeeds = people.length - dietary.none;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["People coming", people.length, "confirmed, plus ones included"],
          ["Dietary needs", withNeeds, `${dietary.none} with none`],
          ["Song requests", songs.length, "for the DJ"],
          ["Seated", `${people.length - tables.unseated.length} / ${people.length}`, `${tables.list.length} tables so far`],
        ].map(([label, value, hint]) => (
          <div key={String(label)} className="border border-white/[0.07] rounded-sm px-4 py-3">
            <p className="text-[10px] tracking-[2px] uppercase text-white/45 mb-1">{label}</p>
            <p className="font-serif text-3xl tabular-nums leading-none text-cream">{value}</p>
            <p className="text-[11px] text-white/35 font-light mt-1.5">{hint}</p>
          </div>
        ))}
      </div>

      {people.length === 0 ? (
        <div className="border border-white/[0.07] rounded-sm py-16 text-center text-white/40 text-sm">
          Nobody has confirmed yet. This fills in as RSVPs arrive.
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card
              title="Catering"
              subtitle="Dietary needs of everyone coming, for the caterer."
              action={
                <button
                  className={downloadButton}
                  onClick={() =>
                    downloadFile(
                      "catering.csv",
                      csv(
                        ["Name", "With", "Table", "Dietary", "Other"],
                        people.map((p) => [p.name, p.isMain ? "" : p.mainName, p.table, p.dietary.join("; "), p.other])
                      )
                    )
                  }
                >
                  Download catering list
                </button>
              }
            >
              {dietary.options.length === 0 && dietary.others.length === 0 ? (
                <p className="text-[13px] text-white/45">No dietary needs so far.</p>
              ) : (
                <ul className="space-y-3">
                  {dietary.options.map(([option, who]) => (
                    <li key={option}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[14px] text-cream/90">{option}</span>
                        <span className="font-serif text-xl text-accent tabular-nums">{who.length}</span>
                      </div>
                      <p className="text-[12px] text-white/45 font-light">{who.map((p) => p.name).join(", ")}</p>
                    </li>
                  ))}
                  {dietary.others.length > 0 && (
                    <li className="pt-2 border-t border-white/[0.06]">
                      <p className="text-[10px] tracking-[1.5px] uppercase text-white/40 mb-1.5">Other requests</p>
                      <ul className="space-y-1">
                        {dietary.others.map((p) => (
                          <li key={p.id} className="text-[13px] text-cream/80">
                            {p.other} <span className="text-white/40">· {p.name}{ofMain(p)}</span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  )}
                </ul>
              )}
              <p className="text-[12px] text-white/35 mt-4">{dietary.none} of {people.length} have no dietary needs.</p>
            </Card>

            <Card
              title="Music"
              subtitle="Everyone's song request, for the DJ."
              action={
                <button
                  className={downloadButton}
                  onClick={() =>
                    downloadFile("song-requests.csv", csv(["Song", "Requested by"], songs.map((p) => [p.song, p.name])))
                  }
                >
                  Download song list
                </button>
              }
            >
              {songs.length === 0 ? (
                <p className="text-[13px] text-white/45">No song requests yet.</p>
              ) : (
                <ul className="divide-y divide-white/[0.05]">
                  {songs.map((p) => (
                    <li key={p.id} className="py-2 flex flex-wrap items-baseline justify-between gap-x-4">
                      <span className="text-[14px] text-cream/90">♪ {p.song}</span>
                      <span className="text-[12px] text-white/45">{p.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card
            title="Tables"
            subtitle="Set each person's table in the Guest list. Everyone confirmed who isn't seated yet is listed last."
            action={
              <button
                className={downloadButton}
                onClick={() =>
                  downloadFile(
                    "seating-plan.csv",
                    csv(
                      ["Table", "Name", "With", "Dietary"],
                      [...tables.list.flatMap(([t, who]) => who.map((p) => [t, p.name, p.isMain ? "" : p.mainName, [...p.dietary, p.other].filter(Boolean).join("; ")])),
                        ...tables.unseated.map((p) => ["Not seated", p.name, p.isMain ? "" : p.mainName, [...p.dietary, p.other].filter(Boolean).join("; ")])]
                    )
                  )
                }
              >
                Download seating plan
              </button>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {tables.list.map(([table, who]) => (
                <div key={table} className="border border-white/[0.07] rounded-sm p-3">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-[13px] text-cream">Table {table}</span>
                    <span className="text-[11px] text-white/40">{who.length} {who.length === 1 ? "person" : "people"}</span>
                  </div>
                  <ul className="space-y-0.5">
                    {who.map((p) => (
                      <li key={p.id} className="text-[12px] text-white/70 truncate" title={p.name}>
                        {!p.isMain && <span className="text-accent/60">↳ </span>}
                        {p.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {tables.unseated.length > 0 && (
                <div className="border border-dashed border-[#E9C46A]/30 rounded-sm p-3">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-[13px] text-[#E9C46A]/90">Not seated yet</span>
                    <span className="text-[11px] text-white/40">{tables.unseated.length}</span>
                  </div>
                  <ul className="space-y-0.5">
                    {tables.unseated.map((p) => (
                      <li key={p.id} className="text-[12px] text-white/60 truncate" title={p.name}>
                        {!p.isMain && <span className="text-accent/60">↳ </span>}
                        {p.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
