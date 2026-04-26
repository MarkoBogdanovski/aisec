import type { Incident } from "@/lib/ui/types";

export function IncidentList({ incidents }: { incidents: Incident[] }) {
  return (
    <div className="grid gap-4">
      {incidents.length ? incidents.map((incident) => (
        <article key={incident.id} className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-[0_10px_28px_rgba(77,53,22,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.16em] text-[#8d2f02]">{incident.severity}</p>
              <h2 className="mt-2 text-xl font-semibold text-[#17212b]">{incident.title}</h2>
            </div>
            <span className="rounded-full border border-black/10 bg-[#17212b] px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-white">
              {incident.status}
            </span>
          </div>
          {incident.description ? (
            <p className="mt-3 text-sm leading-7 text-[#617180]">{incident.description}</p>
          ) : null}
          <p className="mt-4 break-all text-xs text-[#617180]">Incident ID: {incident.id}</p>
        </article>
      )) : (
        <div className="rounded-[1.5rem] border border-dashed border-black/15 bg-white/50 p-8 text-sm text-[#617180]">
          No incidents are available yet from the correlation store.
        </div>
      )}
    </div>
  );
}
