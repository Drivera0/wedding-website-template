import { useEffect, useState } from "react";
import { WEDDING } from "../../config";
import { ACCENTS } from "../../data/palette";

function remaining(target: number) {
  let d = Math.max(0, target - Date.now());
  const days = Math.floor(d / 86400000); d -= days * 86400000;
  const hours = Math.floor(d / 3600000); d -= hours * 3600000;
  const mins = Math.floor(d / 60000); d -= mins * 60000;
  const secs = Math.floor(d / 1000);
  return { days, hours, mins, secs };
}

export default function Countdown() {
  const target = new Date(WEDDING.isoDate).getTime();
  const [t, setT] = useState(() => remaining(target));

  useEffect(() => {
    const id = setInterval(() => setT(remaining(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const units = [
    { n: t.days, l: "Days" },
    { n: t.hours, l: "Hours" },
    { n: t.mins, l: "Minutes" },
    { n: t.secs, l: "Seconds" },
  ];

  return (
    <div className="flex justify-center gap-5 sm:gap-8 md:gap-12">
      {units.map((u, i) => (
        <div key={u.l} className="text-center">
          <div className="font-serif text-[clamp(34px,6.5vw,64px)] leading-none tabular-nums" style={{ color: ACCENTS[i % ACCENTS.length] }}>
            {String(u.n).padStart(2, "0")}
          </div>
          <div className="text-[9px] md:text-[11px] tracking-[2px] uppercase text-cream/50 mt-2">
            {u.l}
          </div>
        </div>
      ))}
    </div>
  );
}
