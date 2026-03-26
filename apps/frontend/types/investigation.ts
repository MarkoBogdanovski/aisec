export type EntityType = 'contract' | 'wallet' | 'protocol' | 'funding-source' | 'counterparty' | 'flagged-service';

export type FraudType =
  | 'phishing'
  | 'money-laundering'
  | 'sanctions'
  | 'rug-pull'
  | 'mixer-exposure'
  | 'drainer'
  | 'wash-trading'
  | 'high-risk'
  | 'none';

export interface InvestigationEntity {
  id: string;
  label: string;
  type: EntityType;
  riskScore: number;
  fraudType: FraudType;
  message: string;
  icon: string;
}

export interface InvestigationRelation {
  id: string;
  source: string;
  target: string;
  label: string;
  strength: number;
}

export interface InvestigationResult {
  id: string;
  subject: string;
  subjectType: 'contract' | 'wallet';
  chainId: string;
  score: number;
  severity: string;
  summary: string;
  findings: Array<Record<string, unknown>>;
  entities: InvestigationEntity[];
  relations: InvestigationRelation[];
}
