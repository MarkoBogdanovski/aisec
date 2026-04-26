import type { InvestigationResult } from "@/lib/ui/types";

function nodeTone(type: string) {
  switch (type) {
    case "wallet":
      return "bg-emerald-100 text-emerald-900 border-emerald-300";
    case "contract":
      return "bg-amber-100 text-amber-900 border-amber-300";
    case "flagged-service":
      return "bg-rose-100 text-rose-900 border-rose-300";
    default:
      return "bg-slate-100 text-slate-900 border-slate-300";
  }
}

export function InvestigationWorkspace({ result }: { result: InvestigationResult | null }) {
  if (!result) return null;

  return (
    <section className="mt-10 grid gap-6">
      <div className="rounded-[2rem] border border-black/10 bg-[rgba(255,250,242,0.9)] p-6 shadow-[0_24px_70px_rgba(77,53,22,0.08)] backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#8d2f02]">Investigation Workspace</p>
            <h2 className="mt-3 break-all text-2xl font-semibold tracking-tight text-[#17212b] md:text-4xl">
              {result.subject}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#617180]">{result.summary}</p>
          </div>
          <div className="grid min-w-[240px] gap-3 sm:grid-cols-2">
            <StatCard label="Severity" value={result.severity} />
            <StatCard label="Risk score" value={`${result.score}/100`} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[2rem] border border-black/10 bg-[rgba(255,250,242,0.82)] p-6 shadow-[0_20px_60px_rgba(77,53,22,0.07)] backdrop-blur">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#8d2f02]">Entity map</p>
              <h3 className="mt-2 text-xl font-semibold text-[#17212b]">Correlation graph</h3>
            </div>
            <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-[#617180]">
              {result.entities.length} nodes
            </span>
          </div>
          <div className="grid gap-4">
            {result.entities.map((entity) => (
              <article
                key={entity.id}
                className={`rounded-[1.4rem] border px-4 py-4 ${nodeTone(entity.type)}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-[0.16em]">{entity.type}</p>
                    <h4 className="mt-2 text-lg font-semibold">{entity.label}</h4>
                  </div>
                  <span className="rounded-full bg-white/70 px-3 py-1 text-sm font-semibold">
                    {entity.riskScore}/100
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 opacity-80">{entity.message}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6">
          <div className="rounded-[2rem] border border-black/10 bg-[rgba(255,250,242,0.82)] p-6 shadow-[0_20px_60px_rgba(77,53,22,0.07)] backdrop-blur">
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#8d2f02]">Relationships</p>
            <h3 className="mt-2 text-xl font-semibold text-[#17212b]">Edge list</h3>
            <div className="mt-5 space-y-3">
              {result.relations.length ? result.relations.map((relation) => (
                <div key={relation.id} className="rounded-[1.2rem] border border-black/10 bg-white/70 px-4 py-3">
                  <p className="text-sm font-semibold text-[#17212b]">{relation.label}</p>
                  <p className="mt-1 text-xs break-all text-[#617180]">
                    {relation.source} -&gt; {relation.target}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#8d2f02]">
                    Strength {(relation.strength * 100).toFixed(0)}%
                  </p>
                </div>
              )) : (
                <p className="text-sm text-[#617180]">No durable relationship edges were returned for this result.</p>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-black/10 bg-[rgba(255,250,242,0.82)] p-6 shadow-[0_20px_60px_rgba(77,53,22,0.07)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#8d2f02]">Fraud signals</p>
                <h3 className="mt-2 text-xl font-semibold text-[#17212b]">Key indicators</h3>
              </div>
              <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-[#617180]">
                {result.findings.length} total
              </span>
            </div>
            <div className="mt-5 grid gap-3">
              {result.findings.map((finding, index) => (
                <div key={`${String(finding.category)}-${index}`} className="rounded-[1.2rem] border border-black/10 bg-white/70 px-4 py-4">
                  <p className="text-xs font-mono uppercase tracking-[0.16em] text-[#617180]">Signal {index + 1}</p>
                  <p className="mt-2 font-semibold text-[#17212b]">
                    {String(finding.category ?? finding.severity ?? "Signal")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#617180]">
                    {String(finding.description ?? JSON.stringify(finding))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-black/10 bg-white/70 px-4 py-4">
      <p className="text-xs font-mono uppercase tracking-[0.16em] text-[#617180]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[#17212b]">{value}</p>
    </div>
  );
}
