"use client";

import { useState } from "react";
import type {
  AnalyzeContractRequest,
  AnalyzeContractResponse,
  AnalyzeWalletRequest,
  AnalyzeWalletResponse,
  ContractAnalysisResponse,
  InvestigationResult,
  JobResultResponse,
} from "@/lib/ui/types";
import { InvestigationWorkspace } from "./investigation-workspace";

const chainOptions = [
  { value: "1", label: "Ethereum Mainnet" },
  { value: "137", label: "Polygon" },
  { value: "56", label: "BNB Smart Chain" },
  { value: "42161", label: "Arbitrum" },
  { value: "10", label: "Optimism" },
  { value: "43114", label: "Avalanche" },
  { value: "8453", label: "Base" },
];

export function AnalysisConsole() {
  const [mode, setMode] = useState<"contract" | "wallet">("contract");
  const [contractForm, setContractForm] = useState<AnalyzeContractRequest>({
    chain_id: "1",
    contract_address: "",
    priority: "normal",
  });
  const [walletForm, setWalletForm] = useState<AnalyzeWalletRequest>({
    chain_id: "1",
    wallet_address: "",
    priority: "normal",
  });
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("idle");
  const [error, setError] = useState<string>("");
  const [analysisSummary, setAnalysisSummary] = useState<string>("");
  const [investigation, setInvestigation] = useState<InvestigationResult | null>(null);

  async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "Request failed");
    }
    return payload as T;
  }

  async function handleContractSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setJobId(null);
    setJobStatus("queued");
    setInvestigation(null);
    setAnalysisSummary("");

    try {
      const response = await requestJson<AnalyzeContractResponse>("/api/v1/analyze/contract", {
        method: "POST",
        body: JSON.stringify(contractForm),
      });

      if (response.mode === "inline" && response.analysis) {
        setJobStatus(response.analysis.status);
        setAnalysisSummary(contractAnalysisText(response.analysis));
        const result = await requestJson<InvestigationResult>(
          `/api/v1/investigations/contract/${contractForm.chain_id}/${contractForm.contract_address}`,
        );
        setInvestigation(result);
        return;
      }

      if (!response.job_id) {
        throw new Error("Contract job did not return a job id");
      }

      setJobId(response.job_id);
      const result = await pollJob(response.job_id);
      setAnalysisSummary(contractAnalysisText(result.analysis));

      const investigationResult = await requestJson<InvestigationResult>(
        `/api/v1/investigations/contract/${contractForm.chain_id}/${contractForm.contract_address}`,
      );
      setInvestigation(investigationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleWalletSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setJobId(null);
    setJobStatus("working");
    setInvestigation(null);
    setAnalysisSummary("");

    try {
      const analysis = await requestJson<AnalyzeWalletResponse>("/api/v1/analyze/wallet", {
        method: "POST",
        body: JSON.stringify(walletForm),
      });

      setJobStatus(analysis.status);
      setAnalysisSummary(
        `Wallet score ${analysis.score}/100, ${analysis.recent_token_transfers} recent token transfers, risk level ${analysis.risk_level}.`,
      );

      const result = await requestJson<InvestigationResult>(
        `/api/v1/investigations/wallet/${analysis.chain_id}/${analysis.wallet_address}`,
      );
      setInvestigation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  async function pollJob(currentJobId: string): Promise<JobResultResponse> {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const update = await requestJson<JobResultResponse>(`/api/v1/jobs/${currentJobId}/result`);
      setJobStatus(update.status);

      if (update.analysis) {
        return update;
      }

      if (update.status === "failed") {
        throw new Error(update.failed_reason || "Contract analysis failed");
      }

      await new Promise((resolve) => window.setTimeout(resolve, 2000));
    }

    throw new Error("Timed out waiting for contract analysis to complete");
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 py-10 md:px-10 md:py-14">
      <section className="w-full rounded-[2rem] border border-black/10 bg-[rgba(255,250,242,0.86)] p-6 shadow-[0_28px_80px_rgba(77,53,22,0.08)] backdrop-blur md:p-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-mono uppercase tracking-[0.22em] text-[#8d2f02]">AISEC Platform Search</p>
          <h1 className="mt-6 text-5xl font-semibold tracking-[-0.05em] text-[#17212b] md:text-7xl">
            Reveal what sits behind any wallet or contract.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[#617180]">
            Search contracts, wallets, incidents, and market anomalies from one surface built around direct chain analysis and a lighter correlation layer.
          </p>
        </div>

        <div className="mx-auto mt-10 w-full max-w-3xl">
          <div className="rounded-[1.8rem] border border-black/10 bg-white/60 p-3">
            <div className="mb-4 flex items-center justify-between rounded-[1.4rem] border border-black/10 bg-[#17212b] px-4 py-3 text-left">
              <div>
                <p className="text-xs font-mono uppercase tracking-[0.18em] text-[#f4b183]">Active search</p>
                <p className="mt-1 text-sm text-[#dde4eb]">
                  {mode === "contract" ? "Smart contract lookup" : "Wallet intelligence lookup"}
                </p>
              </div>
              <div className="flex rounded-full border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setMode("contract")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    mode === "contract" ? "bg-white text-[#17212b]" : "text-white/75"
                  }`}
                >
                  Contract
                </button>
                <button
                  type="button"
                  onClick={() => setMode("wallet")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    mode === "wallet" ? "bg-white text-[#17212b]" : "text-white/75"
                  }`}
                >
                  Wallet
                </button>
              </div>
            </div>

            {mode === "contract" ? (
              <form onSubmit={handleContractSubmit} className="grid gap-4 rounded-[1.5rem] border border-black/10 bg-white/70 p-5">
                <Field label="Network">
                  <select
                    value={contractForm.chain_id}
                    onChange={(event) => setContractForm((current) => ({ ...current, chain_id: event.target.value }))}
                    className="w-full rounded-[1rem] border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#bb4d00]"
                  >
                    {chainOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Contract address">
                  <input
                    value={contractForm.contract_address}
                    onChange={(event) => setContractForm((current) => ({ ...current, contract_address: event.target.value }))}
                    placeholder="0x..."
                    className="w-full rounded-[1rem] border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#bb4d00]"
                  />
                </Field>
                <Field label="Priority">
                  <select
                    value={contractForm.priority}
                    onChange={(event) => setContractForm((current) => ({
                      ...current,
                      priority: event.target.value as AnalyzeContractRequest["priority"],
                    }))}
                    className="w-full rounded-[1rem] border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#bb4d00]"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </Field>
                <SubmitButton label={loading ? "Analyzing..." : "Analyze contract"} disabled={loading} />
              </form>
            ) : (
              <form onSubmit={handleWalletSubmit} className="grid gap-4 rounded-[1.5rem] border border-black/10 bg-white/70 p-5">
                <Field label="Network">
                  <select
                    value={walletForm.chain_id}
                    onChange={(event) => setWalletForm((current) => ({ ...current, chain_id: event.target.value }))}
                    className="w-full rounded-[1rem] border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#bb4d00]"
                  >
                    {chainOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Wallet address">
                  <input
                    value={walletForm.wallet_address}
                    onChange={(event) => setWalletForm((current) => ({ ...current, wallet_address: event.target.value }))}
                    placeholder="0x..."
                    className="w-full rounded-[1rem] border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#bb4d00]"
                  />
                </Field>
                <SubmitButton label={loading ? "Analyzing..." : "Analyze wallet"} disabled={loading} />
              </form>
            )}

            {(jobId || jobStatus !== "idle" || analysisSummary || error) ? (
              <div className="mt-4 rounded-[1.5rem] border border-black/10 bg-[#17212b] px-4 py-4 text-white">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {jobId ? <span className="rounded-full bg-white/10 px-3 py-1">Job {jobId}</span> : null}
                  <span className="rounded-full bg-[#f4b183]/15 px-3 py-1 text-[#f7d0b5]">
                    Status {jobStatus}
                  </span>
                </div>
                {analysisSummary ? <p className="mt-3 text-sm leading-6 text-[#d8e0e8]">{analysisSummary}</p> : null}
                {error ? <p className="mt-3 text-sm leading-6 text-[#ffb4a3]">{error}</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <InvestigationWorkspace result={investigation} />
    </div>
  );
}

function contractAnalysisText(analysis?: ContractAnalysisResponse) {
  if (!analysis) return "";
  if (analysis.status === "failed") return analysis.error || "Contract analysis failed.";

  return `Contract score ${analysis.score ?? "n/a"}/100, severity ${String(analysis.severity ?? "unknown").toUpperCase()}, ${analysis.findings?.length ?? 0} detected findings.`;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-left">
      <span className="text-xs font-mono uppercase tracking-[0.16em] text-[#617180]">{label}</span>
      {children}
    </label>
  );
}

function SubmitButton({ label, disabled }: { label: string; disabled: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="rounded-[1rem] bg-gradient-to-r from-[#bb4d00] to-[#d06b22] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {label}
    </button>
  );
}
