export type JobState =
  | "queued"
  | "completed"
  | "failed"
  | "active"
  | "retrying"
  | "delayed"
  | "waiting"
  | string;

export interface AnalyzeContractRequest {
  chain_id: string;
  contract_address: string;
  priority?: "low" | "normal" | "high";
}

export interface AnalyzeWalletRequest {
  chain_id: string;
  wallet_address: string;
  priority?: "low" | "normal" | "high";
}

export interface AnalyzeContractResponse {
  job_id: string | null;
  status: string;
  estimated_seconds?: number;
  result_url: string;
  mode: "trigger" | "inline";
  analysis?: ContractAnalysisResponse;
}

export interface AnalyzeWalletResponse {
  status: "completed";
  chain_id: string;
  wallet_address: string;
  network: string;
  is_contract: boolean;
  native_balance_wei: string;
  native_balance: string;
  nonce: number;
  latest_block: number;
  recent_token_transfers: number;
  recent_activity_block?: number;
  score: number;
  risk_level: string;
  sanction_flag: boolean;
  mixer_proximity: number;
  sub_scores: Record<string, number>;
}

export interface ContractAnalysisResponse {
  status: "completed" | "failed" | "skipped";
  error?: string;
  name?: string;
  symbol?: string;
  totalSupply?: string;
  decimals?: number;
  functions?: Array<{ selector: string; signature: string }>;
  score?: number;
  severity?: string;
  findings?: Array<Record<string, unknown>>;
  bytecodeHash?: string;
  isProxy?: boolean;
  proxyImplementation?: string | null;
  analysisDuration: number;
}

export interface JobResultResponse {
  job_id: string;
  status: JobState;
  ready: boolean;
  failed_reason?: string;
  analysis?: ContractAnalysisResponse;
}

export interface Incident {
  id: string;
  title: string;
  description?: string | null;
  severity: string;
  status: string;
  incident_type?: string | null;
  created_at?: string;
}

export interface TokenMarketResponse {
  token_address: string;
  chain_id: string;
  source: string;
  analyzed_at: string;
  token: {
    name: string | null;
    symbol: string | null;
    standard: string | null;
    decimals: number | null;
    total_supply: string | null;
  };
  market: {
    latest_price: string | null;
    price_unit: string | null;
    market_cap_usd: string | null;
    volume_24h: string | null;
    price_change_24h: string | null;
    price_change_1h: string | null;
    asset_reference_id: string | null;
    asset_slug: string | null;
  };
  activity: {
    recent_transaction_count: number;
    latest_transaction_at: string | null;
    sample_transactions: Array<{
      hash: string | null;
      sender: string | null;
      recipient: string | null;
      timestamp: string | null;
      status: string | null;
    }>;
  };
  analysis: {
    score: number;
    severity: string;
    signals: Array<{
      type: string;
      severity: string;
      description: string;
      value?: string | number | null;
      observedAt?: string | null;
    }>;
  };
  wallet_connection: {
    wallet_address: string;
    connected: boolean;
    recent_transfer_count: number;
    direction: string;
    last_transfer_at: string | null;
    sample_transfers: Array<{
      transaction_hash: string | null;
      sender: string | null;
      recipient: string | null;
      amount: string | null;
      timestamp: string | null;
    }>;
  } | null;
}

export type EntityType =
  | "contract"
  | "wallet"
  | "protocol"
  | "funding-source"
  | "counterparty"
  | "flagged-service";

export interface InvestigationEntity {
  id: string;
  label: string;
  type: EntityType;
  riskScore: number;
  fraudType: string;
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
  subjectType: "wallet" | "contract";
  chainId: string;
  score: number;
  severity: string;
  summary: string;
  findings: Array<Record<string, unknown>>;
  entities: InvestigationEntity[];
  relations: InvestigationRelation[];
}
