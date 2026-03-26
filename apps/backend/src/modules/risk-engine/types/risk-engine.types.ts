// ─────────────────────────────────────────────────────────────────────────────
// src/modules/risk-engine/types/risk-engine.types.ts
// ─────────────────────────────────────────────────────────────────────────────

// ── Wallet Archetypes ─────────────────────────────────────────────────────────

export enum WalletArchetype {
  NEW       = 'NEW',        // < 5 txs, < 7 days old
  NORMAL    = 'NORMAL',     // standard user activity
  TRADER    = 'TRADER',     // frequent DEX interactions
  DEPLOYER  = 'DEPLOYER',   // contract creator
  BOT       = 'BOT',        // high-frequency, low-value txs
  WHALE     = 'WHALE',      // high-value, low-frequency
  UNKNOWN   = 'UNKNOWN',    // insufficient data to classify
}

// ── Classification Tiers ──────────────────────────────────────────────────────

export enum RiskClassification {
  SAFE      = 'SAFE',       // score 0–15,  confidence ≥ 0.5
  LOW_RISK  = 'LOW_RISK',   // score 16–39, confidence ≥ 0.4
  RISKY     = 'RISKY',      // score 40–69, confidence ≥ 0.5
  MALICIOUS = 'MALICIOUS',  // score 70–100, confidence ≥ 0.7, multiple signals
  UNKNOWN   = 'UNKNOWN',    // confidence < 0.4 OR insufficient data
}

// ── Factor Types ──────────────────────────────────────────────────────────────

export enum FactorType {
  RISK  = 'risk',   // increases risk_score
  TRUST = 'trust',  // decreases risk_score
}

export interface RiskFactor {
  name:        string;
  impact:      number;      // positive = risk increase, negative = trust reduction on risk
  type:        FactorType;
  description: string;
  weight:      number;      // 0–1, configured weight
  confidence:  number;      // 0–1, how certain is this signal
  decayed?:    boolean;     // was time-decay applied
  rawValue?:   number;      // pre-decay value for debugging
}

// ── Raw Wallet Features (Stage 1 output) ─────────────────────────────────────

export interface WalletFeatures {
  address:              string;
  chainId:              string;

  // Activity
  txCount:              number;
  uniqueCounterparties: number;
  contractsDeployed:    number;
  dexInteractions:      number;
  defiProtocols:        string[];   // protocol names interacted with

  // Timing
  firstSeenAt:          Date | null;
  lastSeenAt:           Date | null;
  walletAgeHours:       number;
  avgTxFrequencyPerDay: number;

  // Value
  nativeBalanceEth:     number;
  totalVolumeUsd:       number;

  // Labels & flags
  labels:               string[];   // e.g. ['exchange', 'dao', 'verified']
  isSanctioned:         boolean;
  isKnownExchange:      boolean;
  isKnownProtocol:      boolean;

  // Mixer proximity
  mixerProximityHops:   number | null;  // null = no path found
  mixerInteractionDirect: boolean;

  // Contract activity
  hasDeployedContracts: boolean;
  deployedContractAddresses: string[];

  // Counterparty risk
  highRiskCounterparties: number;   // count of txs with flagged addresses
  totalCounterparties:    number;
}

// ── Classification result (Stage 2 output) ───────────────────────────────────

export interface WalletClassification {
  archetype:  WalletArchetype;
  confidence: number;           // how confident in the archetype
  signals:    string[];         // what drove this classification
}

// ── Confidence result (Stage 4 output) ───────────────────────────────────────

export interface ConfidenceResult {
  score:       number;          // 0–1
  components:  ConfidenceComponent[];
  hasEnoughData: boolean;
}

export interface ConfidenceComponent {
  name:        string;
  value:       number;          // 0–1 contribution
  weight:      number;          // how much this component matters
  description: string;
}

// ── Final scoring output (Stage 5 output) ────────────────────────────────────

export interface WalletRiskResult {
  address:         string;
  chainId:         string;
  risk_score:      number;            // 0–100
  confidence_score: number;           // 0–1
  classification:  RiskClassification;
  archetype:       WalletArchetype;
  factors:         RiskFactor[];
  meta: {
    analyzedAt:    string;            // ISO8601
    version:       string;            // scorer version
    durationMs:    number;
    dataPoints:    number;            // how many signals were evaluated
  };
}

// ── Scoring config (weights, thresholds) ─────────────────────────────────────

export interface ScoringWeights {
  // Risk weights
  sanctionedAddress:        number;
  directMixerInteraction:   number;
  mixerProximity1Hop:       number;
  mixerProximity2Hop:       number;
  highRiskCounterpartyRatio: number;
  veryLowActivity:          number;
  suspiciousFrequency:      number;
  noKnownLabels:            number;

  // Trust weights
  knownExchange:            number;
  knownProtocol:            number;
  verifiedLabel:            number;
  defiInteraction:          number;
  longHistory:              number;
  highCounterpartyDiversity: number;
  lowRiskCounterpartyRatio:  number;
}

export interface ScoringConfig {
  weights:    ScoringWeights;
  thresholds: {
    minConfidenceForClassification: number;   // below this → UNKNOWN
    minConfidenceForMalicious:      number;   // below this → can't be MALICIOUS
    minSignalsForMalicious:         number;   // need this many risk signals
    maliciousScoreFloor:            number;   // min score to be MALICIOUS
    riskyScoreFloor:                number;
    lowRiskScoreFloor:              number;
  };
  decay: {
    mixerInteractionHours:    number;
    counterpartyRiskHours:    number;
    behaviorSignalHours:      number;
  };
}

// ── Default configuration ─────────────────────────────────────────────────────

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: {
    // Risk — ordered by severity
    sanctionedAddress:          90,
    directMixerInteraction:     55,
    mixerProximity1Hop:         15,
    mixerProximity2Hop:          5,
    highRiskCounterpartyRatio:  30,
    veryLowActivity:             0,   // explicitly zero — not a risk signal
    suspiciousFrequency:        20,
    noKnownLabels:               0,   // explicitly zero — absence is not evidence

    // Trust — reduce risk score
    knownExchange:              40,
    knownProtocol:              35,
    verifiedLabel:              20,
    defiInteraction:            15,
    longHistory:                10,
    highCounterpartyDiversity:  10,
    lowRiskCounterpartyRatio:    8,
  },
  thresholds: {
    minConfidenceForClassification: 0.40,
    minConfidenceForMalicious:      0.70,
    minSignalsForMalicious:            2,   // at least 2 independent risk signals
    maliciousScoreFloor:            70,
    riskyScoreFloor:                40,
    lowRiskScoreFloor:              16,
  },
  decay: {
    mixerInteractionHours:    720,    // 30 days half-life
    counterpartyRiskHours:    168,    // 7 days half-life
    behaviorSignalHours:       72,    // 3 days half-life
  },
};
