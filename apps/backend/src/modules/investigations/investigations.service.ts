import { Injectable } from '@nestjs/common';
import { Severity } from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import {
  InvestigationEntityType,
  InvestigationSubjectType,
} from '../../enums/investigation.enum';
import { MarketSignalSeverity } from '../../enums/market.enum';
import { MarketService } from '../market/market.service';
import { WalletIntelligenceService } from '../wallet-intelligence/wallet-intelligence.service';

type SubjectType = InvestigationSubjectType;
type EntityType = InvestigationEntityType;
type FraudType =
  | 'phishing'
  | 'money-laundering'
  | 'sanctions'
  | 'rug-pull'
  | 'mixer-exposure'
  | 'drainer'
  | 'wash-trading'
  | 'high-risk'
  | 'none';

type InvestigationEntity = {
  id: string;
  label: string;
  type: EntityType;
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

type InvestigationResult = {
  id: string;
  subject: string;
  subjectType: SubjectType;
  chainId: string;
  score: number;
  severity: string;
  summary: string;
  findings: Array<Record<string, unknown>>;
  entities: InvestigationEntity[];
  relations: InvestigationRelation[];
};

@Injectable()
export class InvestigationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly marketService: MarketService,
    private readonly walletIntelligence: WalletIntelligenceService,
  ) {}

  async buildContractInvestigation(
    chainId: string,
    address: string,
  ): Promise<InvestigationResult | null> {
    const contract = await this.prisma.contract.findUnique({
      where: { chainId_address: { chainId, address } },
      include: {
        findings: { where: { isActive: true }, orderBy: { createdAt: 'desc' }, take: 10 },
        incidents: {
          include: { incident: { include: { findings: true } } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        riskScores: { orderBy: { analyzedAt: 'desc' }, take: 1 },
      },
    });

    if (!contract) {
      return null;
    }

    const latestRisk = contract.riskScores[0];
    const score = latestRisk?.score ?? this.maxRiskScore(contract.findings.map((finding) => finding.riskScore ?? 0));
    const severity = latestRisk?.severity?.toUpperCase() ?? this.severityFromScore(score);

    const findings: Array<Record<string, unknown>> = [];
    const entities: InvestigationEntity[] = [];
    const relations: InvestigationRelation[] = [];
    const entityIds = new Set<string>();
    const relationIds = new Set<string>();

    this.pushEntity(entityIds, entities, this.createEntity(
      `contract:${address}`,
      contract.name || contract.symbol || address,
      InvestigationEntityType.CONTRACT,
      score,
      this.normalizeFraudType(latestRisk?.severity ?? contract.contractType),
      `Latest contract risk score is ${score}/100 with severity ${severity}.`,
      'C',
    ));

    contract.findings.forEach((finding, index) => {
      findings.push({
        category: finding.title,
        severity: finding.severity,
        description: finding.description,
        source: 'contract_finding',
      });

      const findingEntityId = `contract-finding:${contract.id}:${index}`;
      this.pushEntity(entityIds, entities, this.createEntity(
        findingEntityId,
        finding.title,
        InvestigationEntityType.FLAGGED_SERVICE,
        finding.riskScore ?? Math.min(95, score + 5),
        this.normalizeFraudType(finding.title),
        finding.description,
        '!',
      ));
      this.pushRelation(relationIds, relations, {
        id: `relation:${contract.id}:finding:${index}`,
        source: `contract:${address}`,
        target: findingEntityId,
        label: 'flagged by',
        strength: this.strengthFromRisk(finding.riskScore ?? score),
      });
    });

    const liveTokenAnalysis = await this.safeAnalyzeToken(
      chainId,
      address,
      contract.deployerAddress ?? undefined,
    );

    liveTokenAnalysis?.analysis.signals.forEach((signal, index) => {
      findings.push({
        category: signal.type,
        severity: signal.severity,
        description: signal.description,
        source: 'market_signal',
      });

      const eventEntityId = `market-signal:${address}:${index}`;
      this.pushEntity(entityIds, entities, this.createEntity(
        eventEntityId,
        signal.type.replace(/_/g, ' '),
        InvestigationEntityType.FLAGGED_SERVICE,
        this.scoreFromSeverity(signal.severity),
        this.normalizeFraudType(signal.type),
        signal.description,
        'M',
      ));
      this.pushRelation(relationIds, relations, {
        id: `relation:${contract.id}:market:${index}`,
        source: `contract:${address}`,
        target: eventEntityId,
        label: 'market signal',
        strength: this.strengthFromRisk(this.scoreFromSeverity(signal.severity)),
      });
    });

    if (liveTokenAnalysis?.wallet_connection?.connected) {
      const connection = liveTokenAnalysis.wallet_connection;
      const linkedWalletEntityId = `wallet:${connection.wallet_address}`;
      this.pushEntity(entityIds, entities, this.createEntity(
        linkedWalletEntityId,
        connection.wallet_address,
        InvestigationEntityType.WALLET,
        Math.min(80, 20 + connection.recent_transfer_count * 10),
        'none',
        `Wallet has ${connection.recent_transfer_count} recent token transfer connections to this token.`,
        'W',
      ));
      this.pushRelation(relationIds, relations, {
        id: `relation:${contract.id}:linked-wallet:${connection.wallet_address}`,
        source: `contract:${address}`,
        target: linkedWalletEntityId,
        label: 'transferred with',
        strength: this.strengthFromRisk(Math.min(80, 20 + connection.recent_transfer_count * 10)),
      });
    }

    for (const entity of contract.incidents) {
      findings.push({
        category: entity.incident.title,
        severity: entity.incident.severity,
        description: entity.incident.description,
        source: 'incident',
      });

      const incidentEntityId = `incident:${entity.incident.id}`;
      this.pushEntity(entityIds, entities, this.createEntity(
        incidentEntityId,
        entity.incident.title,
        InvestigationEntityType.FLAGGED_SERVICE,
        this.scoreFromSeverity(entity.incident.severity),
        this.normalizeFraudType(entity.incident.incidentType),
        entity.incident.description,
        'I',
      ));
      this.pushRelation(relationIds, relations, {
        id: `relation:${contract.id}:incident:${entity.incident.id}`,
        source: `contract:${address}`,
        target: incidentEntityId,
        label: entity.role || 'linked to',
        strength: this.strengthFromRisk(this.scoreFromSeverity(entity.incident.severity)),
      });
    }

    if (contract.deployerAddress) {
      const deployerProfile = await this.walletIntelligence.profileWallet(chainId, contract.deployerAddress);
      const deployerEntityId = `wallet:${contract.deployerAddress}`;
      this.pushEntity(entityIds, entities, this.createEntity(
        deployerEntityId,
        contract.deployerAddress,
        InvestigationEntityType.WALLET,
        deployerProfile.score,
        this.normalizeFraudType(deployerProfile.risk_level),
        `Deployer wallet analyzed with risk level ${deployerProfile.risk_level}.`,
        'W',
      ));
      this.pushRelation(relationIds, relations, {
        id: `relation:${contract.id}:deployer`,
        source: `contract:${address}`,
        target: deployerEntityId,
        label: 'deployed by',
        strength: this.strengthFromRisk(deployerProfile.score),
      });

      findings.push({
        category: 'deployer_wallet',
        severity: deployerProfile.risk_level,
        description: `Deployer wallet risk level is ${deployerProfile.risk_level} with score ${deployerProfile.score}/100.`,
        source: 'wallet_profile',
      });
    }

    return {
      id: `contract:${address}`,
      subject: address,
      subjectType: InvestigationSubjectType.CONTRACT,
      chainId,
      score,
      severity,
      summary: this.composeSummary(InvestigationSubjectType.CONTRACT, {
        findings: contract.findings.length,
        incidents: contract.incidents.length,
        marketSignals: liveTokenAnalysis?.analysis.signals.length ?? 0,
        linkedWallets: contract.deployerAddress ? 1 : 0,
      }),
      findings: findings.slice(0, 16),
      entities,
      relations,
    };
  }

  async buildWalletInvestigation(
    chainId: string,
    address: string,
  ): Promise<InvestigationResult | null> {
    const profile = await this.walletIntelligence.profileWallet(chainId, address);

    const wallet = await this.prisma.wallet.findUnique({
      where: { chainId_address: { chainId, address } },
      include: {
        incidents: {
          include: { incident: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        reputation: { orderBy: { profiledAt: 'desc' }, take: 1 },
      },
    });

    const deployedContracts = await this.prisma.contract.findMany({
      where: { chainId, deployerAddress: { equals: address, mode: 'insensitive' } },
      include: { riskScores: { orderBy: { analyzedAt: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
      take: 8,
    });

    const liveTokenAnalyses = (
      await Promise.all(
        deployedContracts.slice(0, 3).map((contract) =>
          this.safeAnalyzeToken(chainId, contract.address, address),
        ),
      )
    ).filter((value): value is NonNullable<typeof value> => Boolean(value));

    const findings: Array<Record<string, unknown>> = [
      {
        category: profile.risk_level,
        severity: profile.risk_level,
        description: `Wallet analyzed live with score ${profile.score}/100 and ${profile.recent_token_transfers} recent token transfer events.`,
        source: 'wallet_profile',
      },
    ];

    Object.entries(profile.sub_scores).forEach(([key, value]) => {
      findings.push({
        category: key,
        severity:
          value >= 70
            ? MarketSignalSeverity.HIGH
            : value >= 40
              ? MarketSignalSeverity.MEDIUM
              : MarketSignalSeverity.LOW,
        description: `${key.replace(/_/g, ' ')} score is ${value}.`,
        source: 'wallet_signal',
      });
    });

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
      'W',
    ));

    deployedContracts.forEach((contract, index) => {
      const contractScore = contract.riskScores[0]?.score ?? 35;
      this.pushEntity(entityIds, entities, this.createEntity(
        `contract:${contract.address}`,
        contract.name || contract.symbol || contract.address,
        InvestigationEntityType.CONTRACT,
        contractScore,
        this.normalizeFraudType(contract.riskScores[0]?.severity ?? contract.contractType),
        `Contract deployed by this wallet${contract.name ? `: ${contract.name}` : ''}.`,
        'C',
      ));
      this.pushRelation(relationIds, relations, {
        id: `relation:${address}:contract:${index}`,
        source: `wallet:${address}`,
        target: `contract:${contract.address}`,
        label: 'deployed',
        strength: this.strengthFromRisk(contractScore),
      });

      findings.push({
        category: contract.name || contract.contractType,
        severity: contract.riskScores[0]?.severity?.toUpperCase() ?? this.severityFromScore(contractScore),
        description: `Linked deployed contract ${contract.address} has score ${contractScore}/100.`,
        source: 'deployed_contract',
      });
    });

    wallet?.incidents.forEach((entity) => {
      this.pushEntity(entityIds, entities, this.createEntity(
        `incident:${entity.incident.id}`,
        entity.incident.title,
        InvestigationEntityType.FLAGGED_SERVICE,
        this.scoreFromSeverity(entity.incident.severity),
        this.normalizeFraudType(entity.incident.incidentType),
        entity.incident.description,
        'I',
      ));
      this.pushRelation(relationIds, relations, {
        id: `relation:${address}:incident:${entity.incident.id}`,
        source: `wallet:${address}`,
        target: `incident:${entity.incident.id}`,
        label: entity.role || 'linked to',
        strength: this.strengthFromRisk(this.scoreFromSeverity(entity.incident.severity)),
      });

      findings.push({
        category: entity.incident.title,
        severity: entity.incident.severity,
        description: entity.incident.description,
        source: 'incident',
      });
    });

    liveTokenAnalyses.forEach((analysis, index) => {
      analysis.analysis.signals.forEach((signal, signalIndex) => {
        const targetId = `market-signal:${analysis.token_address}:${signalIndex}`;
        this.pushEntity(entityIds, entities, this.createEntity(
          targetId,
          signal.type.replace(/_/g, ' '),
          InvestigationEntityType.FLAGGED_SERVICE,
          this.scoreFromSeverity(signal.severity),
          this.normalizeFraudType(signal.type),
          `${signal.description} Token: ${analysis.token_address}.`,
          'M',
        ));
        this.pushRelation(relationIds, relations, {
          id: `relation:${address}:market:${index}:${signalIndex}`,
          source: `wallet:${address}`,
          target: targetId,
          label: 'correlates with',
          strength: this.strengthFromRisk(this.scoreFromSeverity(signal.severity)),
        });

        findings.push({
          category: signal.type,
          severity: signal.severity,
          description: `${signal.description} Token: ${analysis.token_address}.`,
          source: 'market_signal',
        });
      });

      if (analysis.wallet_connection?.connected) {
        findings.push({
          category: 'wallet_token_connection',
          severity:
            analysis.wallet_connection.recent_transfer_count >= 5
              ? MarketSignalSeverity.HIGH
              : MarketSignalSeverity.MEDIUM,
          description: `Wallet has ${analysis.wallet_connection.recent_transfer_count} recent transfers involving deployed token ${analysis.token_address}.`,
          source: 'market_signal',
        });
      }
    });

    return {
      id: `wallet:${address}`,
      subject: address,
      subjectType: InvestigationSubjectType.WALLET,
      chainId,
      score: profile.score,
      severity: profile.risk_level,
      summary: this.composeSummary(InvestigationSubjectType.WALLET, {
        findings: findings.length,
        incidents: wallet?.incidents.length ?? 0,
        marketSignals: liveTokenAnalyses.reduce((sum, analysis) => sum + analysis.analysis.signals.length, 0),
        linkedWallets: 0,
        linkedContracts: deployedContracts.length,
      }),
      findings: findings.slice(0, 16),
      entities,
      relations,
    };
  }

  private createEntity(
    id: string,
    label: string,
    type: EntityType,
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
    if (seen.has(entity.id)) {
      return;
    }
    seen.add(entity.id);
    collection.push(entity);
  }

  private pushRelation(seen: Set<string>, collection: InvestigationRelation[], relation: InvestigationRelation) {
    if (seen.has(relation.id)) {
      return;
    }
    seen.add(relation.id);
    collection.push(relation);
  }

  private normalizeFraudType(value: unknown): FraudType {
    const text = String(value ?? '').toLowerCase();
    if (text.includes('phish')) return 'phishing';
    if (text.includes('launder') || text.includes('mixer')) return 'money-laundering';
    if (text.includes('sanction')) return 'sanctions';
    if (text.includes('rug')) return 'rug-pull';
    if (text.includes('drain') || text.includes('exploit')) return 'drainer';
    if (text.includes('wash') || text.includes('volume')) return 'wash-trading';
    if (text && text !== 'low' && text !== 'minimal') return 'high-risk';
    return 'none';
  }

  private severityFromScore(score: number): string {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  }

  private scoreFromSeverity(severity: string): number {
    switch (severity.toUpperCase() as Severity | string) {
      case 'CRITICAL':
        return 92;
      case 'HIGH':
        return 74;
      case 'MEDIUM':
      case 'INVESTIGATING':
        return 56;
      case 'LOW':
      case 'OPEN':
      default:
        return 34;
    }
  }

  private maxRiskScore(values: number[]): number {
    if (!values.length) return 25;
    return Math.max(...values);
  }

  private async safeAnalyzeToken(chainId: string, tokenAddress: string, walletAddress?: string) {
    try {
      return await this.marketService.analyzeTokenActivity(chainId, tokenAddress, walletAddress);
    } catch {
      return null;
    }
  }

  private strengthFromRisk(score: number): number {
    return Math.max(0.35, Math.min(0.95, score / 100));
  }

  private composeSummary(
    subjectType: SubjectType,
    input: {
      findings: number;
      incidents: number;
      marketSignals: number;
      linkedWallets?: number;
      linkedContracts?: number;
    },
  ): string {
    if (subjectType === 'contract') {
      return `Correlated contract investigation assembled from ${input.findings} findings, ${input.marketSignals} market signals, ${input.incidents} linked incidents, and ${input.linkedWallets ?? 0} related deployer wallets.`;
    }

    return `Correlated wallet investigation assembled from ${input.findings} live signals, ${input.linkedContracts ?? 0} deployed contracts, ${input.marketSignals} linked market anomalies, and ${input.incidents} incident links.`;
  }
}
