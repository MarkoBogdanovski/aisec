export interface ContractAnalysisView {
  contract_address: string;
  chain_id: string;
  score: number;
  severity: string;
  analyzed_at: string;
  findings: Array<Record<string, unknown>>;
  ai_explanation: string | null;
}

export interface JobResultView {
  job_id: string;
  status: string;
  ready: boolean;
  progress?: number;
  failed_reason?: string;
  chain_id?: string;
  contract_address?: string;
  result_url?: string;
  analysis?: ContractAnalysisView;
}

export interface JobRealtimeEnvelope {
  event: 'connection.ready' | 'job.subscribed' | 'job.unsubscribed' | 'job.status' | 'job.result';
  data: Record<string, unknown>;
}
