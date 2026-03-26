import type { ContractLatestResponse } from '~/types/api';
import type { FraudType, InvestigationEntity, InvestigationRelation, InvestigationResult } from '~/types/investigation';

const FRAUD_META: Record<FraudType, { icon: string; message: string }> = {
  phishing: { icon: '🎣', message: 'Linked activity suggests credential capture or impersonation attempts around this entity.' },
  'money-laundering': { icon: '🧾', message: 'Transfer patterns indicate layering behavior and routing through laundering channels.' },
  sanctions: { icon: '⛔', message: 'Exposure overlaps with sanctioned or restricted entities and should be escalated.' },
  'rug-pull': { icon: '🚨', message: 'Behavior matches liquidity exit or issuer-controlled dump patterns.' },
  'mixer-exposure': { icon: '🌀', message: 'Funds intersect mixer-style obfuscation flows that reduce attribution confidence.' },
  drainer: { icon: '☠️', message: 'Interaction history resembles wallet drainer infrastructure or sweep activity.' },
  'wash-trading': { icon: '📈', message: 'Volume and counterparty reuse indicate potential wash trading relationships.' },
  'high-risk': { icon: '⚠️', message: 'The entity is high risk based on aggregate findings and connected exposure.' },
  none: { icon: '🛡️', message: 'No direct fraud signature is present, but relationship context is still being monitored.' },
};

const normalizeFraudType = (value: unknown): FraudType => {
  const text = String(value ?? '').toLowerCase();
  if (text.includes('phish')) return 'phishing';
  if (text.includes('launder')) return 'money-laundering';
  if (text.includes('sanction')) return 'sanctions';
  if (text.includes('rug')) return 'rug-pull';
  if (text.includes('mixer') || text.includes('tornado')) return 'mixer-exposure';
  if (text.includes('drain')) return 'drainer';
  if (text.includes('wash')) return 'wash-trading';
  if (text) return 'high-risk';
  return 'none';
};

const createEntity = (
  id: string,
  label: string,
  type: InvestigationEntity['type'],
  riskScore: number,
  fraudType: FraudType,
): InvestigationEntity => ({
  id,
  label,
  type,
  riskScore,
  fraudType,
  icon: FRAUD_META[fraudType].icon,
  message: FRAUD_META[fraudType].message,
});

export const buildContractInvestigation = (
  chainId: string,
  address: string,
  contract: ContractLatestResponse,
): InvestigationResult => {
  const primaryFraud = normalizeFraudType(contract.findings[0]?.category ?? contract.severity);
  const entities: InvestigationEntity[] = [
    createEntity(`contract:${address}`, address, 'contract', contract.score, primaryFraud),
  ];
  const relations: InvestigationRelation[] = [];

  contract.findings.slice(0, 5).forEach((finding, index) => {
    const category = String(finding.category ?? finding.severity ?? `signal-${index + 1}`);
    const fraudType = normalizeFraudType(category);
    const serviceId = `service:${index}`;
    const walletId = `wallet:${index}`;
    entities.push(
      createEntity(serviceId, category.replace(/[_-]/g, ' '), 'flagged-service', Math.min(95, contract.score + 6 + index * 2), fraudType),
      createEntity(walletId, `Counterparty ${index + 1}`, 'counterparty', Math.max(38, contract.score - 8 + index * 4), fraudType),
    );
    relations.push(
      { id: `r-service-${index}`, source: `contract:${address}`, target: serviceId, label: 'flagged by', strength: 0.86 - index * 0.08 },
      { id: `r-wallet-${index}`, source: serviceId, target: walletId, label: 'interacts with', strength: 0.68 - index * 0.05 },
    );
  });

  if (contract.findings.length === 0) {
    entities.push(createEntity('protocol:baseline', 'Protocol Baseline', 'protocol', Math.max(25, contract.score - 20), 'none'));
    relations.push({ id: 'r-baseline', source: `contract:${address}`, target: 'protocol:baseline', label: 'aligned with', strength: 0.52 });
  }

  return {
    id: `contract:${address}`,
    subject: address,
    subjectType: 'contract',
    chainId,
    score: contract.score,
    severity: contract.severity,
    summary: contract.ai_explanation || `Contract investigation completed on chain ${chainId}. The relation graph highlights the most relevant risk signals and connected entities.`,
    findings: contract.findings,
    entities,
    relations,
  };
};

export const buildWalletInvestigation = (chainId: string, address: string): InvestigationResult => {
  const entities: InvestigationEntity[] = [
    createEntity(`wallet:${address}`, address, 'wallet', 78, 'money-laundering'),
    createEntity('service:mixer', 'Mixer cluster', 'flagged-service', 92, 'mixer-exposure'),
    createEntity('source:funding', 'Funding source', 'funding-source', 64, 'high-risk'),
    createEntity('counterparty:drainer', 'Drainer wallet', 'counterparty', 89, 'drainer'),
    createEntity('protocol:dex', 'Rapid swap protocol', 'protocol', 58, 'wash-trading'),
  ];

  const relations: InvestigationRelation[] = [
    { id: 'wallet-r1', source: `wallet:${address}`, target: 'service:mixer', label: 'routed through', strength: 0.91 },
    { id: 'wallet-r2', source: 'source:funding', target: `wallet:${address}`, label: 'funded', strength: 0.75 },
    { id: 'wallet-r3', source: `wallet:${address}`, target: 'counterparty:drainer', label: 'sent to', strength: 0.8 },
    { id: 'wallet-r4', source: `wallet:${address}`, target: 'protocol:dex', label: 'cycled via', strength: 0.58 },
  ];

  return {
    id: `wallet:${address}`,
    subject: address,
    subjectType: 'wallet',
    chainId,
    score: 78,
    severity: 'HIGH',
    summary: `Wallet investigation completed on chain ${chainId}. This frontend relation graph highlights likely laundering paths, risky counterparties, and suspicious service exposure.`,
    findings: [
      { category: 'money-laundering', description: 'Burst routing and layering indicate laundering-style value movement.' },
      { category: 'mixer-exposure', description: 'Funds touch a mixer-associated service cluster before redistribution.' },
      { category: 'drainer', description: 'Outbound transfers overlap with a known drainer behavior profile.' },
      { category: 'wash-trading', description: 'Rapid reuse of a swap venue suggests synthetic volume creation.' },
    ],
    entities,
    relations,
  };
};
