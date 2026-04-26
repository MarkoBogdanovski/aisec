export enum AnalysisStatus {
  COMPLETED = "completed",
}

export enum MarketSignalSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum MarketConnectionDirection {
  INBOUND = "INBOUND",
  OUTBOUND = "OUTBOUND",
  BIDIRECTIONAL = "BIDIRECTIONAL",
  NONE = "NONE",
}

export enum MarketAnalysisSource {
  CRYPTOAPIS = "cryptoapis",
}

export type RiskLevel = "MINIMAL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
