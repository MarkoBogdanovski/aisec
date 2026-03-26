import { b as useRuntimeConfig } from './server.mjs';

const useApi = () => {
  const config = useRuntimeConfig();
  const base = config.public.apiBase.replace(/\/+$/, "");
  const request = async (path, options = {}) => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return await $fetch(`${base}${normalizedPath}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options == null ? void 0 : options.headers) || {}
      }
    });
  };
  return {
    request,
    health: () => $fetch(`${base.replace("/api/v1", "")}/health`),
    analyzeContract: (payload) => request("/analyze/contract", {
      method: "POST",
      body: payload
    }),
    getJob: (jobId) => request(`/jobs/${jobId}`),
    getJobResult: (jobId) => request(`/jobs/${jobId}/result`),
    getContractLatest: (chainId, address) => request(`/contracts/${chainId}/${address}`),
    getContractHistory: (chainId, address) => request(`/contracts/${chainId}/${address}/history`),
    getIncidents: (params) => request("/incidents", { method: "GET", params }),
    getIncident: (id) => request(`/incidents/${id}`),
    getMarketEvents: (limit = 20) => request(`/market/events?limit=${limit}`),
    getTokenSummary: (address) => request(`/market/token/${address}`),
    analyzeWallet: (payload) => request("/analyze/wallet", { method: "POST", body: payload })
  };
};

export { useApi as u };
//# sourceMappingURL=useApi-DDBd4HqR.mjs.map
