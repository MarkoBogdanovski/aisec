import type {
  AnalyzeContractRequest,
  AnalyzeContractResponse,
  AnalyzeWalletRequest,
  AnalyzeWalletResponse,
  ContractHistoryResponse,
  ContractLatestResponse,
  Incident,
  JobResultResponse,
  JobStatusResponse,
  MarketEvent,
  TokenSummaryResponse,
} from '~/types/api';
import type { InvestigationResult } from '~/types/investigation';

export const useApi = () => {
  const config = useRuntimeConfig();
  const base = config.public.apiBase.replace(/\/+$/, '');

  const request = async <T>(path: string, options: Parameters<typeof $fetch<T>>[1] = {}) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    return await $fetch<T>(`${base}${normalizedPath}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
  };

  return {
    request,
    health: () => $fetch<{ status: string }>(`${base.replace('/api/v1', '')}/health`),
    analyzeContract: (payload: AnalyzeContractRequest) =>
      request<AnalyzeContractResponse>('/analyze/contract', {
        method: 'POST',
        body: payload,
      }),
    getJob: (jobId: string) => request<JobStatusResponse>(`/jobs/${jobId}`),
    getJobResult: (jobId: string) => request<JobResultResponse>(`/jobs/${jobId}/result`),
    getContractLatest: (chainId: string, address: string) =>
      request<ContractLatestResponse>(`/contracts/${chainId}/${address}`),
    getContractHistory: (chainId: string, address: string) =>
      request<ContractHistoryResponse>(`/contracts/${chainId}/${address}/history`),
    getIncidents: (params?: { severity?: string; status?: string }) =>
      request<Incident[]>('/incidents', { method: 'GET', params }),
    getIncident: (id: string) => request(`/incidents/${id}`),
    getMarketEvents: (limit = 20) => request<MarketEvent[]>(`/market/events?limit=${limit}`),
    getTokenSummary: (address: string) => request<TokenSummaryResponse>(`/market/token/${address}`),
    analyzeWallet: (payload: AnalyzeWalletRequest) =>
      request<AnalyzeWalletResponse>('/analyze/wallet', { method: 'POST', body: payload }),
    getInvestigation: (subjectType: 'wallet' | 'contract', chainId: string, address: string) =>
      request<InvestigationResult>(`/investigations/${subjectType}/${chainId}/${address}`),
  };
};
