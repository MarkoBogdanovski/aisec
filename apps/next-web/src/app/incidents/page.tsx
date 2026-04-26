import { AppShell } from "@/components/app-shell";
import { IncidentList } from "@/components/incident-list";
import type { Incident } from "@/lib/ui/types";

async function getIncidents(): Promise<Incident[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/v1/incidents`, { cache: "no-store" });
  if (!response.ok) {
    return [];
  }
  return response.json();
}

export default async function IncidentsPage() {
  const incidents = await getIncidents();

  return (
    <AppShell>
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 md:px-10 md:py-14">
        <div className="rounded-[2rem] border border-black/10 bg-[rgba(255,250,242,0.86)] p-6 shadow-[0_24px_70px_rgba(77,53,22,0.08)] backdrop-blur">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#8d2f02]">Security incidents</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#17212b]">Durable incident ledger</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#617180]">
            These records come from the correlation store in Supabase. They are the durable side of the new architecture.
          </p>
        </div>
        <IncidentList incidents={incidents} />
      </section>
    </AppShell>
  );
}
