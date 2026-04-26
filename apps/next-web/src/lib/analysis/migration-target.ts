export const migrationTarget = {
  runtime: {
    app: "Next.js App Router",
    jobs: "Trigger.dev",
    persistence: "Supabase",
    realtime: "SSE",
  },
  directAnalysis: {
    contract: true,
    wallet: true,
    tokenMarketHistory: false,
  },
  retireFirst: [
    "NestJS app shell",
    "BullMQ queues",
    "Redis job orchestration",
    "Persisted analysis result tables",
  ],
  persistOnly: [
    "Correlation entities",
    "Entity edges",
    "Investigations",
    "Notes and labels",
  ],
} as const;

export const featureMigrationTracks = [
  {
    id: "wallet",
    status: "ready",
    source: "apps/backend/src/modules/wallet-intelligence",
    target: "src/lib/analysis/wallet",
    note: "Already mostly live-chain and easiest to port first.",
  },
  {
    id: "market",
    status: "ready",
    source: "apps/backend/src/modules/market",
    target: "src/lib/analysis/market",
    note: "Already ephemeral and provider-backed.",
  },
  {
    id: "contract",
    status: "needs-split",
    source: "apps/backend/src/modules/contract-analyzer",
    target: "src/lib/analysis/contract + Trigger.dev task",
    note: "Needs queue and persistence concerns separated from pure analysis logic.",
  },
  {
    id: "correlation",
    status: "rebuild",
    source: "apps/backend/src/modules/investigations + incidents",
    target: "src/lib/correlation + Supabase",
    note: "This is the only area that should stay durable.",
  },
] as const;
