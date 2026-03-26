<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <FeatureCard
      v-for="feature in features"
      :key="feature.id"
      :feature="feature"
    />
  </div>
</template>

<script setup lang="ts">
interface Feature {
  id: string;
  icon: string;
  title: string;
  description: string;
  link: string;
}

const features: Feature[] = [
  {
    id: 'contract-analysis',
    icon: '🔍',
    title: 'Smart Contract Analysis',
    description: 'Submit Ethereum and EVM-compatible smart contracts for comprehensive security analysis with vulnerability detection and risk scoring.',
    link: '/',
  },
  {
    id: 'risk-scoring',
    icon: '📊',
    title: 'Risk Scoring & Severity',
    description: 'Get quantified risk scores (0-100) with severity classifications (Low, Medium, High, Critical) based on detected vulnerabilities.',
    link: '/',
  },
  {
    id: 'findings',
    icon: '🎯',
    title: 'Detailed Findings',
    description: 'Comprehensive security findings including vulnerability types, severity levels, confidence scores, and detailed explanations.',
    link: '/',
  },
  {
    id: 'incidents',
    icon: '⚠️',
    title: 'Incident Tracking',
    description: 'Track and monitor active security incidents across the Web3 ecosystem with real-time severity and status updates.',
    link: '/incidents',
  },
  {
    id: 'market-anomalies',
    icon: '📈',
    title: 'Market Anomalies',
    description: 'Detect and monitor suspicious market events and token threats with automated anomaly detection and alerting.',
    link: '/market',
  },
  {
    id: 'history',
    icon: '📜',
    title: 'Analysis History',
    description: 'Track historical analysis results for contracts with timestamped records and trend analysis over time.',
    link: '/',
  },
  {
    id: 'type-detection',
    icon: '🏷️',
    title: 'Contract Type Detection',
    description: 'Automatically identify contract types (ERC20, ERC721, ERC1155, Governance, Staking, Multisig, etc.) from bytecode.',
    link: '/',
  },
  {
    id: 'metadata',
    icon: '📋',
    title: 'Metadata Extraction',
    description: 'Extract and display contract metadata including name, symbol, total supply, decimals, and deployment information.',
    link: '/',
  },
  {
    id: 'multi-chain',
    icon: '⛓️',
    title: 'Multi-Chain Support',
    description: 'Analysis support for Ethereum, Polygon, BSC, and other EVM-compatible networks with network-specific RPC configuration.',
    link: '/',
  },
  {
    id: 'ai-explanation',
    icon: '🤖',
    title: 'AI-Powered Insights',
    description: 'Get AI-generated explanations for security findings with contextual recommendations.',
    link: '/',
  },
  {
    id: 'priority-queuing',
    icon: '⚡',
    title: 'Priority Queuing',
    description: 'Configure analysis priority (Low, Normal, High) with estimated completion times and job status tracking.',
    link: '/',
  },
  {
    id: 'wallet-intelligence',
    icon: '👛',
    title: 'Wallet Intelligence (Phase 2)',
    description: 'Coming soon: Advanced wallet profiling, fund flow analysis, reputation scoring, and behavioral insights.',
    link: '/',
  },
];
</script>
