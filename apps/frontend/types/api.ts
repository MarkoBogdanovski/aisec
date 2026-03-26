export type JobState =
  | 'queued'
  | 'completed'
  | 'failed'
  | 'active'
  | 'retrying'
  | 'delayed'
  | 'waiting'
  | string;

export interface AnalyzeContractRequest {
  chain_id: string;
  contract_address: string;
  priority?: 'low' | 'normal' | 'high';
}

export interface AnalyzeContractResponse {
  job_id: string;
  status: 'queued';
  estimated_seconds: number;
  result_url: string;
}

export interface AnalyzeWalletRequest {
  chain_id: string;
  wallet_address: string;
  priority?: 'low' | 'normal' | 'high';
}

export interface AnalyzeWalletResponse {
  status: 'not_implemented';
  message: string;
}

export interface JobStatusResponse {
  job_id: string;
  status: JobState;
  progress?: number;
  result?: unknown;
  failed_reason?: string;
}

export interface ContractLatestResponse {
  contract_address: string;
  chain_id: string;
  score: number;
  severity: string;
  analyzed_at: string;
  findings: Array<Record<string, unknown>>;
  ai_explanation: string | null;
}

export interface JobResultResponse {
  job_id: string;
  status: JobState;
  ready: boolean;
  progress?: number;
  failed_reason?: string;
  chain_id?: string;
  contract_address?: string;
  result_url?: string;
  analysis?: ContractLatestResponse;
}

export interface JobRealtimeEnvelope {
  event: 'connection.ready' | 'job.subscribed' | 'job.unsubscribed' | 'job.status' | 'job.result';
  data: Record<string, unknown>;
}

export interface ContractHistoryResponse {
  contract_address: string;
  chain_id: string;
  history: Array<{
    score: number;
    severity: string;
    analyzed_at: string;
    job_id: string | null;
    findings: Array<Record<string, unknown>>;
  }>;
}

export interface Incident {
  id: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED' | string;
  createdAt: string;
}

export interface MarketEvent {
  id: string;
  tokenAddress: string;
  eventType: string;
  severity: string;
  detectedAt: string;
}

export interface TokenSummaryResponse {
  token_address: string;
  event_count: number;
  latest_severity: string;
  recent_events: MarketEvent[];
}
