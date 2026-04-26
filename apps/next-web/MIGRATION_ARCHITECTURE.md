# Next.js Migration Architecture

## Goal

Replace the current Nuxt frontend and Nest backend with a single Next.js application in `apps/next-web`.

The new target is:

- `Next.js` for UI and API routes
- `Trigger.dev` for long-running contract analysis jobs
- `Supabase` for minimal persistence needed by the correlation engine
- direct RPC and indexed market APIs for analysis data
- no persistence layer for analysis history unless we prove we need it later

## Final Target

### Keep

- contract analysis logic
- wallet analysis logic
- token and market analysis logic
- shared logger patterns
- real-time progress delivery to the frontend

### Remove

- NestJS application shell
- BullMQ queues and worker runtime
- Redis job orchestration
- Prisma-backed storage for analysis history
- contract result polling that only exists to look up persisted rows
- backend-only websocket servers that exist to bridge job state

### Replace

- BullMQ jobs with `Trigger.dev` tasks
- Prisma analysis persistence with transient task output
- backend websocket updates with `SSE` from Next.js route handlers
- most database-backed wallet features with direct chain reads
- market history reconstruction with external indexed market data providers

## Minimal Persistence Strategy

We are intentionally not keeping a full analysis database.

### Persist in Supabase

- correlations between entities
- investigation/session state
- user-generated labels, notes, and saved watchlists
- optional cache keys for deduping expensive correlation runs
- any long-lived relationship graph data the correlation engine needs

### Do not persist by default

- contract analysis results
- wallet analysis results
- token market snapshots
- per-job intermediate analysis state

### Optional short-lived storage

- in-memory cache inside Next.js for fast repeat reads in development
- short TTL cache table in Supabase only if cost forces us to add one later

## Analysis Runtime Model

### Contract

- start analysis from a Next.js route
- run the heavy work in `Trigger.dev`
- inspect bytecode, selectors, proxy slots, deployer, metadata, and optional verification data
- stream progress and final result back to the client
- return the final result directly instead of reading it back from a database row

### Wallet

- run on demand directly from a Next.js route for fast paths
- use chain RPC for balance, nonce, code, token transfer logs, and recent activity
- use Trigger.dev only if we add deeper multi-step wallet workflows later
- do not write wallet analysis results to the database

### Token and Market

- fetch token contract facts from RPC
- fetch market history and liquidity context from an indexed provider
- do not build raw-chain market history reconstruction inside app runtime

Recommended providers to evaluate:

- Dexscreener
- GeckoTerminal
- Crypto APIs
- Covalent

## Correlation Engine

Supabase stays because it solves the one thing we should persist: relationships over time.

The correlation engine should store:

- normalized entities
- edges between wallet, contract, token, deployer, protocol, and incident nodes
- evidence references
- user annotations
- investigation groupings

The correlation engine should not depend on a historical analysis result table.

Instead it should consume fresh analysis output and persist only:

- stable entity identity
- stable relationships
- evidence pointers
- investigator decisions

## Real-time Delivery

Default approach:

- `Trigger.dev` emits progress events
- Next.js exposes `SSE` endpoints for the frontend
- frontend subscribes per analysis request

Use websockets only if we later prove that bidirectional realtime is needed.

## Migration Order

1. Move the frontend shell and routes into `apps/next-web`
2. Create shared server libraries for contract, wallet, market, and correlation logic
3. Recreate the public API surface in Next.js route handlers
4. Move long-running contract analysis into Trigger.dev tasks
5. Add Supabase persistence only for correlation entities, edges, notes, and investigations
6. Replace backend job status delivery with SSE
7. Retire `apps/frontend` and `apps/backend`

## Backend Retirement Map

### Retire first

- `apps/backend/src/queues`
- `apps/backend/src/common/redis`
- `apps/backend/src/modules/contract-analyzer/contract-analyze.worker.ts`
- `apps/backend/src/modules/contract-analyzer/job-updates.service.ts`
- `apps/backend/src/modules/contract-analyzer/jobs.controller.ts`

### Port and simplify

- `apps/backend/src/modules/contract-analyzer/contract-analyzer.service.ts`
- `apps/backend/src/modules/wallet-intelligence/wallet-intelligence.service.ts`
- `apps/backend/src/modules/market/market.service.ts`
- `apps/backend/src/common/logger`
- `apps/backend/src/common/web3`

### Rebuild around Supabase

- investigations
- incidents
- correlation graph storage

## Recommended Immediate Build Sequence

1. land the new app structure and env contract
2. port wallet and market analysis first because they are already closest to live analysis
3. split contract analysis into pure analysis code and Trigger.dev task wrapper
4. add minimal Supabase tables for the correlation engine only
