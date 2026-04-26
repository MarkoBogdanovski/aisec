# Correlation Persistence

## Purpose

Supabase is kept only for durable correlation data. Analysis output stays ephemeral unless a user explicitly saves or promotes something into an investigation.

## Persisted Tables

### `entities`

Stores normalized identities:

- wallet
- contract
- token
- protocol
- incident

Suggested fields:

- `id`
- `entity_type`
- `chain_id`
- `address`
- `symbol`
- `name`
- `created_at`
- `updated_at`

### `entity_edges`

Stores durable relationships between entities.

Suggested fields:

- `id`
- `from_entity_id`
- `to_entity_id`
- `edge_type`
- `confidence`
- `source`
- `evidence`
- `created_at`

Example edge types:

- `DEPLOYED_BY`
- `INTERACTED_WITH`
- `HOLDS_TOKEN`
- `HAS_MARKET_EXPOSURE`
- `LINKED_TO_INCIDENT`

### `investigations`

Stores investigation containers.

Suggested fields:

- `id`
- `title`
- `description`
- `status`
- `created_by`
- `created_at`
- `updated_at`

### `investigation_entities`

Connects saved entities to investigations.

### `investigation_notes`

Stores analyst notes, labels, and decisions.

## Explicit Non-Goals

Do not add tables for:

- contract analysis history
- wallet analysis history
- token market snapshot history
- job queue state
- websocket session state

## Save Rule

Fresh analysis runs should only create durable rows when one of these is true:

- the correlation engine derives a durable entity or edge
- a user saves the result into an investigation
- we need a cache key to prevent duplicate expensive correlation work
