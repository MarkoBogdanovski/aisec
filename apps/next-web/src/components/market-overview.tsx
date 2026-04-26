"use client";

import { useState } from "react";
import type { TokenMarketResponse } from "@/lib/ui/types";

export function MarketOverview() {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<TokenMarketResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`/api/v1/market/token/${address}?chainId=1`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Market lookup failed");
      }
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Market lookup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 md:px-10 md:py-14">
      <div className="rounded-[2rem] border border-black/10 bg-[rgba(255,250,242,0.86)] p-6 shadow-[0_24px_70px_rgba(77,53,22,0.08)] backdrop-blur">
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#8d2f02]">Market anomalies</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#17212b]">Token market lookup</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#617180]">
          Query live token activity, price volatility, and transfer-linked wallet context from the new Next.js runtime.
        </p>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-3 md:flex-row">
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Token address 0x..."
            className="flex-1 rounded-[1rem] border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#bb4d00]"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-[1rem] bg-[#17212b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#24303d] disabled:opacity-60"
          >
            {loading ? "Loading..." : "Analyze token"}
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-[#b93c12]">{error}</p> : null}
      </div>

      {result ? (
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-black/10 bg-[rgba(255,250,242,0.82)] p-6 shadow-[0_20px_60px_rgba(77,53,22,0.07)]">
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#8d2f02]">Snapshot</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#17212b]">
              {result.token.name || result.token.symbol || result.token_address}
            </h2>
            <dl className="mt-5 grid gap-3">
              <Metric label="Score" value={`${result.analysis.score}/100`} />
              <Metric label="Severity" value={result.analysis.severity} />
              <Metric label="24h volume" value={result.market.volume_24h ?? "n/a"} />
              <Metric label="24h price change" value={result.market.price_change_24h ?? "n/a"} />
              <Metric label="Recent tx count" value={String(result.activity.recent_transaction_count)} />
            </dl>
          </div>

          <div className="rounded-[2rem] border border-black/10 bg-[rgba(255,250,242,0.82)] p-6 shadow-[0_20px_60px_rgba(77,53,22,0.07)]">
            <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#8d2f02]">Signals</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#17212b]">Detected anomalies</h2>
            <div className="mt-5 grid gap-3">
              {result.analysis.signals.length ? result.analysis.signals.map((signal) => (
                <div key={`${signal.type}-${signal.description}`} className="rounded-[1.2rem] border border-black/10 bg-white/70 px-4 py-4">
                  <p className="text-xs font-mono uppercase tracking-[0.16em] text-[#617180]">{signal.severity}</p>
                  <p className="mt-2 font-semibold text-[#17212b]">{signal.type.replaceAll("_", " ")}</p>
                  <p className="mt-2 text-sm leading-6 text-[#617180]">{signal.description}</p>
                </div>
              )) : (
                <p className="text-sm text-[#617180]">No signal anomalies were returned for this token.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-black/10 bg-white/70 px-4 py-3">
      <dt className="text-xs font-mono uppercase tracking-[0.16em] text-[#617180]">{label}</dt>
      <dd className="mt-2 text-sm font-semibold text-[#17212b]">{value}</dd>
    </div>
  );
}
