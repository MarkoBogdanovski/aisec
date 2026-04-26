import { MarketSignalSeverity } from "@/lib/analysis/shared";
import { marketAnalysisService } from "@/lib/analysis/market/service";
import { walletAnalysisService } from "@/lib/analysis/wallet/service";
import { correlationRepository } from "@/lib/correlation/repository";
import { InvestigationEntityType, InvestigationSubjectType } from "./types";

type FraudType =
  | "phishing"
  | "money-laundering"
  | "sanctions"
  | "rug-pull"
  | "mixer-exposure"
  | "drainer"
  | "wash-trading"
  | "high-risk"
  | "none";

type InvestigationEntity = {
  id: string;
  label: string;
  type: InvestigationEntityType;
  riskScore: number;
  fraudType: FraudType;
  message: string;
  icon: string;
};

type InvestigationRelation = {
  id: string;
  source: string;
  target: string;
  label: string;
  strength: number;
};

export type InvestigationResult = {
  id: string;
  subject: string;
  subjectType: InvestigationSubjectType;
  chainId: string;
  score: number;
  severity: string;
  summary: string;
  findings: Array<Record<string, unknown>>;
  entities: InvestigationEntity[];
  relations: InvestigationRelation[];
};

export class InvestigationsService {
  async buildWalletInvestigation(chainId: string, address: string): Promise<InvestigationResult> {
    const profile = await walletAnalysisService.profileWallet(chainId, address);
    const incidents = await correlationRepository.listLinkedIncidents("wallet", chainId, address);

    const findings: Array<Record<string, unknown>> = [
      {
        category: profile.risk_level,
        severity: profile.risk_level,
        description: `Wallet analyzed live with score ${profile.score}/100 and ${profile.recent_token_transfers} recent token transfer events.`,
        source: "wallet_profile",
      },
    ];

    const entities: InvestigationEntity[] = [];
    const relations: InvestigationRelation[] = [];
    const entityIds = new Set<string>();
    const relationIds = new Set<string>();

    this.pushEntity(entityIds, entities, this.createEntity(
      `wallet:${address}`,
      address,
      InvestigationEntityType.WALLET,
      profile.score,
      this.normalizeFraudType(profile.risk_level),
      `Wallet has ${profile.recent_token_transfers} recent transfer events and current risk level ${profile.risk_level}.`,
      "W",
    ));

    incidents.forEach((incident) => {
      this.pushEntity(entityIds, entities, this.createEntity(
        `incident:${incident.id}`,
        incident.title,
        InvestigationEntityType.FLAGGED_SERVICE,
        this.scoreFromSeverity(incident.severity),
        this.normalizeFraudType(incident.incident_type),
        incident.description ?? "Linked incident",
        "I",
      ));
      this.pushRelation(relationIds, relations, {
        id: `relation:${address}:incident:${incident.id}`,
        source: `wallet:${address}`,
        target: `incident:${incident.id}`,
        label: incident.role || "linked to",
        strength: this.strengthFromRisk(this.scoreFromSeverity(incident.severity)),
      });
      findings.push({
        category: incident.title,
        severity: incident.severity,
        description: incident.description,
        source: "incident",
      });
    });

    Object.entries(profile.sub_scores).forEach(([key, value]) => {
      findings.push({
        category: key,
        severity:
          value >= 70
            ? MarketSignalSeverity.HIGH
            : value >= 40
              ? MarketSignalSeverity.MEDIUM
              : MarketSignalSeverity.LOW,
        description: `${key.replace(/_/g, " ")} score is ${value}.`,
        source: "wallet_signal",
      });
    });

    return {
      id: `wallet:${address}`,
      subject: address,
      subjectType: InvestigationSubjectType.WALLET,
      chainId,
      score: profile.score,
      severity: profile.risk_level,
      summary: `Correlated wallet investigation assembled from ${findings.length} live signals and ${incidents.length} incident links.`,
      findings: findings.slice(0, 16),
      entities,
      relations,
    };
  }

  async buildContractInvestigation(chainId: string, address: string): Promise<InvestigationResult> {
    const incidents = await correlationRepository.listLinkedIncidents("contract", chainId, address);
    const market = await this.safeAnalyzeToken(chainId, address);

    const entities: InvestigationEntity[] = [];
    const relations: InvestigationRelation[] = [];
    const findings: Array<Record<string, unknown>> = [];
    const entityIds = new Set<string>();
    const relationIds = new Set<string>();

    const score = market?.analysis.score ?? 28;
    const severity = market?.analysis.severity ?? MarketSignalSeverity.LOW;

    this.pushEntity(entityIds, entities, this.createEntity(
      `contract:${address}`,
      market?.token.name || market?.token.symbol || address,
      InvestigationEntityType.CONTRACT,
      score,
      this.normalizeFraudType(severity),
      `Contract investigation built from live token signals and durable incident links.`,
      "C",
    ));

    market?.analysis.signals.forEach((signal, index) => {
      const targetId = `market-signal:${address}:${index}`;
      this.pushEntity(entityIds, entities, this.createEntity(
        targetId,
        signal.type.replace(/_/g, " "),
        InvestigationEntityType.FLAGGED_SERVICE,
        this.scoreFromSeverity(signal.severity),
        this.normalizeFraudType(signal.type),
        signal.description,
        "M",
      ));
      this.pushRelation(relationIds, relations, {
        id: `relation:${address}:market:${index}`,
        source: `contract:${address}`,
        target: targetId,
        label: "market signal",
        strength: this.strengthFromRisk(this.scoreFromSeverity(signal.severity)),
      });
      findings.push({
        category: signal.type,
        severity: signal.severity,
        description: signal.description,
        source: "market_signal",
      });
    });

    incidents.forEach((incident) => {
      this.pushEntity(entityIds, entities, this.createEntity(
        `incident:${incident.id}`,
        incident.title,
        InvestigationEntityType.FLAGGED_SERVICE,
        this.scoreFromSeverity(incident.severity),
        this.normalizeFraudType(incident.incident_type),
        incident.description ?? "Linked incident",
        "I",
      ));
      this.pushRelation(relationIds, relations, {
        id: `relation:${address}:incident:${incident.id}`,
        source: `contract:${address}`,
        target: `incident:${incident.id}`,
        label: incident.role || "linked to",
        strength: this.strengthFromRisk(this.scoreFromSeverity(incident.severity)),
      });
      findings.push({
        category: incident.title,
        severity: incident.severity,
        description: incident.description,
        source: "incident",
      });
    });

    return {
      id: `contract:${address}`,
      subject: address,
      subjectType: InvestigationSubjectType.CONTRACT,
      chainId,
      score,
      severity: String(severity),
      summary: `Correlated contract investigation assembled from ${findings.length} findings and ${incidents.length} incident links.`,
      findings: findings.slice(0, 16),
      entities,
      relations,
    };
  }

  private createEntity(
    id: string,
    label: string,
    type: InvestigationEntityType,
    riskScore: number,
    fraudType: FraudType,
    message: string,
    icon: string,
  ): InvestigationEntity {
    return {
      id,
      label,
      type,
      riskScore: Math.max(0, Math.min(100, Math.round(riskScore))),
      fraudType,
      message,
      icon,
    };
  }

  private pushEntity(seen: Set<string>, collection: InvestigationEntity[], entity: InvestigationEntity) {
    if (seen.has(entity.id)) return;
    seen.add(entity.id);
    collection.push(entity);
  }

  private pushRelation(seen: Set<string>, collection: InvestigationRelation[], relation: InvestigationRelation) {
    if (seen.has(relation.id)) return;
    seen.add(relation.id);
    collection.push(relation);
  }

  private normalizeFraudType(value: unknown): FraudType {
    const text = String(value ?? "").toLowerCase();
    if (text.includes("phish")) return "phishing";
    if (text.includes("launder") || text.includes("mixer")) return "money-laundering";
    if (text.includes("sanction")) return "sanctions";
    if (text.includes("rug")) return "rug-pull";
    if (text.includes("drain") || text.includes("exploit")) return "drainer";
    if (text.includes("wash") || text.includes("volume")) return "wash-trading";
    if (text && text !== "low" && text !== "minimal") return "high-risk";
    return "none";
  }

  private scoreFromSeverity(severity: string) {
    switch (String(severity).toUpperCase()) {
      case "CRITICAL":
        return 92;
      case "HIGH":
        return 74;
      case "MEDIUM":
      case "INVESTIGATING":
        return 56;
      default:
        return 34;
    }
  }

  private strengthFromRisk(score: number) {
    return Math.max(0.35, Math.min(0.95, score / 100));
  }

  private async safeAnalyzeToken(chainId: string, tokenAddress: string, walletAddress?: string) {
    try {
      return await marketAnalysisService.analyzeTokenActivity(chainId, tokenAddress, walletAddress);
    } catch {
      return null;
    }
  }
}

export const investigationsService = new InvestigationsService();
