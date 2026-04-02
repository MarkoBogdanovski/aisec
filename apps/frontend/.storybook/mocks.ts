import type {
  AnalyzeContractResponse,
  AnalyzeWalletResponse,
  ContractHistoryResponse,
  ContractLatestResponse,
  Incident,
  JobResultResponse,
  MarketEvent,
} from '~/types/api';
import type { InvestigationResult } from '~/types/investigation';

const contractAnalysis: ContractLatestResponse = {
  contract_address: '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chain_id: '1',
  score: 78,
  severity: 'HIGH',
  analyzed_at: '2026-04-02T18:30:00.000Z',
  ai_explanation:
    'This token contract shows elevated privilege concentration and several admin-controlled flows that would benefit from tighter operational safeguards.',
  findings: [
    {
      category: 'Access Control',
      severity: 'HIGH',
      description: 'Owner can pause transfers and update critical fee parameters without time delay.',
    },
    {
      category: 'Upgradeability',
      severity: 'MEDIUM',
      description: 'Proxy admin is externally owned and not protected by multisig controls.',
    },
    {
      category: 'Operational Risk',
      severity: 'MEDIUM',
      description: 'Emergency roles are documented, but no on-chain timelock is visible for privileged actions.',
    },
  ],
};

const contractHistory: ContractHistoryResponse = {
  contract_address: contractAnalysis.contract_address,
  chain_id: contractAnalysis.chain_id,
  history: [
    {
      score: 78,
      severity: 'HIGH',
      analyzed_at: '2026-04-02T18:30:00.000Z',
      job_id: 'job-contract-001',
      findings: contractAnalysis.findings,
    },
    {
      score: 64,
      severity: 'MEDIUM',
      analyzed_at: '2026-03-24T09:10:00.000Z',
      job_id: 'job-contract-000',
      findings: [
        {
          category: 'Centralization',
          severity: 'MEDIUM',
          description: 'Administrative powers remain concentrated in a single deployer wallet.',
        },
      ],
    },
  ],
};

const incidents: Incident[] = [
  {
    id: 'inc-001',
    title: 'Drainer cluster activity detected',
    severity: 'CRITICAL',
    status: 'INVESTIGATING',
    createdAt: '2026-04-02T15:20:00.000Z',
  },
  {
    id: 'inc-002',
    title: 'Bridge monitoring alert on abnormal withdrawal volume',
    severity: 'HIGH',
    status: 'OPEN',
    createdAt: '2026-04-01T10:45:00.000Z',
  },
];

const marketEvents: MarketEvent[] = [
  {
    id: 'mkt-001',
    tokenAddress: '0x111111111117dc0aa78b770fa6a738034120c302',
    eventType: 'Liquidity Spike',
    severity: 'MEDIUM',
    detectedAt: '2026-04-02T19:05:00.000Z',
  },
  {
    id: 'mkt-002',
    tokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    eventType: 'Wash Trading Pattern',
    severity: 'HIGH',
    detectedAt: '2026-04-02T16:50:00.000Z',
  },
];

const walletInvestigation: InvestigationResult = {
  id: 'inv-wallet-001',
  subject: '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
  subjectType: 'wallet',
  chainId: '1',
  score: 61,
  severity: 'MEDIUM',
  summary: 'Wallet shows links to high-risk counterparties and repeated interactions with exchange off-ramps.',
  findings: [
    {
      category: 'Mixer Exposure',
      severity: 'HIGH',
      description: 'Two direct hops to a known obfuscation cluster in the last 30 days.',
    },
    {
      category: 'Counterparty Risk',
      severity: 'MEDIUM',
      description: 'Funds routed through wallets previously associated with phishing campaigns.',
    },
  ],
  entities: [
    {
      id: 'wallet-root',
      label: 'Primary Wallet',
      type: 'wallet',
      riskScore: 61,
      fraudType: 'high-risk',
      message: 'Primary address under investigation.',
      icon: 'W',
    },
    {
      id: 'service-1',
      label: 'Flagged Mixer',
      type: 'flagged-service',
      riskScore: 92,
      fraudType: 'mixer-exposure',
      message: 'Observed direct interaction with a mixer-labelled service.',
      icon: 'M',
    },
    {
      id: 'counterparty-1',
      label: 'Exchange Off-ramp',
      type: 'counterparty',
      riskScore: 35,
      fraudType: 'none',
      message: 'Frequent outbound transfers to a centralized exchange.',
      icon: 'E',
    },
  ],
  relations: [
    { id: 'rel-1', source: 'wallet-root', target: 'service-1', label: '2 hops', strength: 0.82 },
    { id: 'rel-2', source: 'wallet-root', target: 'counterparty-1', label: '6 txns', strength: 0.58 },
  ],
};

const contractInvestigation: InvestigationResult = {
  id: 'inv-contract-001',
  subject: contractAnalysis.contract_address,
  subjectType: 'contract',
  chainId: contractAnalysis.chain_id,
  score: contractAnalysis.score,
  severity: contractAnalysis.severity,
  summary:
    'Contract exhibits elevated governance concentration and clear operational dependencies that may amplify blast radius during an incident.',
  findings: contractAnalysis.findings,
  entities: [
    {
      id: 'contract-root',
      label: 'USDC Proxy',
      type: 'contract',
      riskScore: 78,
      fraudType: 'high-risk',
      message: 'Core contract under analysis.',
      icon: 'C',
    },
    {
      id: 'wallet-admin',
      label: 'Admin Multisig',
      type: 'wallet',
      riskScore: 44,
      fraudType: 'none',
      message: 'Controls upgrade and pause privileges.',
      icon: 'A',
    },
    {
      id: 'source-1',
      label: 'Treasury Funding',
      type: 'funding-source',
      riskScore: 21,
      fraudType: 'none',
      message: 'Primary treasury route that funds governance operations.',
      icon: 'T',
    },
    {
      id: 'protocol-1',
      label: 'Bridge Adapter',
      type: 'protocol',
      riskScore: 53,
      fraudType: 'none',
      message: 'External protocol integration with privileged messaging paths.',
      icon: 'P',
    },
  ],
  relations: [
    { id: 'edge-1', source: 'wallet-admin', target: 'contract-root', label: 'upgrade rights', strength: 0.88 },
    { id: 'edge-2', source: 'source-1', target: 'wallet-admin', label: 'ops funding', strength: 0.67 },
    { id: 'edge-3', source: 'protocol-1', target: 'contract-root', label: 'bridge calls', strength: 0.74 },
  ],
};

const analyzeContractResponse: AnalyzeContractResponse = {
  job_id: 'job-contract-001',
  status: 'queued',
  estimated_seconds: 12,
  result_url: '/api/v1/jobs/job-contract-001/result',
};

const analyzeWalletResponse: AnalyzeWalletResponse = {
  status: 'completed',
  chain_id: walletInvestigation.chainId,
  wallet_address: walletInvestigation.subject,
  network: 'Ethereum',
  is_contract: false,
  native_balance_wei: '2100000000000000000',
  native_balance: '2.1',
  nonce: 128,
  latest_block: 22510422,
  recent_token_transfers: 17,
  recent_activity_block: 22510310,
  score: walletInvestigation.score,
  risk_level: walletInvestigation.severity,
  sanction_flag: false,
  mixer_proximity: 2,
  sub_scores: {
    sanctions: 8,
    counterparties: 63,
    obfuscation: 81,
  },
};

const completedJobResult: JobResultResponse = {
  job_id: analyzeContractResponse.job_id,
  status: 'completed',
  ready: true,
  progress: 100,
  chain_id: contractAnalysis.chain_id,
  contract_address: contractAnalysis.contract_address,
  analysis: contractAnalysis,
};

const respond = <T>(data: T) =>
  Promise.resolve(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

const matchPath = (input: string) => {
  try {
    return new URL(input).pathname + new URL(input).search;
  } catch {
    return input;
  }
};

let installed = false;

class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;

  url: string;
  readyState = MockWebSocket.OPEN;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.onopen?.(new Event('open'));
      this.emit({
        event: 'connection.ready',
        data: {},
      });
    }, 30);
  }

  send(payload: string) {
    const data = JSON.parse(payload) as { action?: string; jobId?: string };
    if (data.action === 'subscribe' && data.jobId) {
      setTimeout(() => {
        this.emit({
          event: 'job.status',
          data: {
            job_id: data.jobId,
            status: 'active',
            progress: 68,
          },
        });
      }, 120);
      setTimeout(() => {
        this.emit({
          event: 'job.result',
          data: completedJobResult,
        });
      }, 260);
    }
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  private emit(payload: unknown) {
    this.onmessage?.(
      new MessageEvent('message', {
        data: JSON.stringify(payload),
      }),
    );
  }
}

export const storybookMockData = {
  contractAnalysis,
  contractHistory,
  contractInvestigation,
  walletInvestigation,
  incidents,
  marketEvents,
};

export const installStorybookMocks = () => {
  if (installed || typeof window === 'undefined') {
    return;
  }

  installed = true;

  const nativeFetch = window.fetch.bind(window);

  const mockedFetch: typeof window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    const path = matchPath(url);
    const method = (init?.method || (typeof input !== 'string' ? input.method : 'GET') || 'GET').toUpperCase();

    if (method === 'POST' && path.includes('/analyze/contract')) {
      return respond(analyzeContractResponse);
    }

    if (method === 'POST' && path.includes('/analyze/wallet')) {
      return respond({
        ...analyzeWalletResponse,
        message: 'Wallet analysis completed in Storybook mock mode.',
      });
    }

    if (method === 'GET' && path.includes('/jobs/') && path.includes('/result')) {
      return respond(completedJobResult);
    }

    if (method === 'GET' && path.includes('/contracts/') && path.includes('/history')) {
      return respond(contractHistory);
    }

    if (method === 'GET' && path.includes('/contracts/')) {
      return respond(contractAnalysis);
    }

    if (method === 'GET' && path.includes('/incidents')) {
      return respond(incidents);
    }

    if (method === 'GET' && path.includes('/market/events')) {
      return respond(marketEvents);
    }

    if (method === 'GET' && path.includes('/investigations/contract/')) {
      return respond(contractInvestigation);
    }

    if (method === 'GET' && path.includes('/investigations/wallet/')) {
      return respond(walletInvestigation);
    }

    return nativeFetch(input, init);
  };

  window.fetch = mockedFetch;
  globalThis.fetch = mockedFetch;
  globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;

  try {
    window.localStorage.setItem(
      'recentSearches',
      JSON.stringify([
        {
          id: 'recent-1',
          query: contractAnalysis.contract_address,
          type: 'contract',
          timestamp: new Date('2026-04-02T19:00:00.000Z'),
        },
        {
          id: 'recent-2',
          query: walletInvestigation.subject,
          type: 'wallet',
          timestamp: new Date('2026-04-02T18:15:00.000Z'),
        },
      ]),
    );
  } catch {
    // Ignore localStorage access issues in non-browser contexts.
  }
};
