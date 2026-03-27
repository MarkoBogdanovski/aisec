-- CreateEnum
CREATE TYPE "FindingType" AS ENUM ('VULNERABILITY', 'SUSPICIOUS_PATTERN', 'COMPLIANCE_ISSUE', 'CODE_SMELL', 'SECURITY_BEST_PRACTICE', 'FINANCIAL_RISK', 'LIQUIDITY_RISK', 'GOVERNANCE_RISK');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('MINIMAL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "Network" AS ENUM ('ETHEREUM', 'POLYGON', 'BSC', 'ARBITRUM', 'OPTIMISM', 'AVALANCHE', 'FANTOM', 'BASE');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('ERC20', 'ERC721', 'ERC1155', 'GOVERNANCE', 'STAKING', 'DEFI_PROTOCOL', 'BRIDGE', 'MULTISIG', 'CUSTOM');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED', 'FALSE_POSITIVE');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('HACK', 'RUG_PULL', 'FLASH_LOAN_ATTACK', 'EXPLOIT', 'PHISHING', 'FRONT_RUNNING', 'LIQUIDITY_CRISIS', 'GOVERNANCE_ATTACK');

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "chainId" TEXT NOT NULL DEFAULT '1',
    "address" TEXT NOT NULL,
    "bytecodeHash" TEXT,
    "abi" JSONB,
    "isProxy" BOOLEAN NOT NULL DEFAULT false,
    "proxyImpl" TEXT,
    "name" TEXT,
    "symbol" TEXT,
    "network" "Network" NOT NULL,
    "contractType" "ContractType" NOT NULL,
    "deployerAddress" TEXT,
    "deploymentBlock" BIGINT,
    "deploymentTx" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalSupply" TEXT,
    "decimals" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_risk_scores" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "severity" TEXT NOT NULL,
    "findings" JSONB NOT NULL DEFAULT '[]',
    "analyzerVersion" TEXT DEFAULT '1.0.0',
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "jobId" TEXT,

    CONSTRAINT "contract_risk_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "plan" TEXT NOT NULL DEFAULT 'free',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT,
    "name" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY['read']::TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_events" (
    "id" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "txHash" TEXT,
    "blockNumber" BIGINT,
    "evidence" JSONB,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_reputation_scores" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "mixerProximity" INTEGER,
    "sanctionFlag" BOOLEAN NOT NULL DEFAULT false,
    "subScores" JSONB,
    "profiledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classification" TEXT,
    "archetype" TEXT,
    "confidenceScore" DOUBLE PRECISION,

    CONSTRAINT "wallet_reputation_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_findings" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "findingType" "FindingType" NOT NULL,
    "severity" "Severity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "details" JSONB,
    "confidence" DOUBLE PRECISION,
    "riskScore" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "chainId" TEXT NOT NULL DEFAULT '1',
    "address" TEXT NOT NULL,
    "label" TEXT,
    "isContract" BOOLEAN NOT NULL DEFAULT false,
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "isWhitelisted" BOOLEAN NOT NULL DEFAULT false,
    "riskLevel" "RiskLevel",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "network" "Network" NOT NULL,
    "totalSupply" TEXT,
    "holderCount" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_token_relations" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "balance" TEXT NOT NULL,
    "usdValue" DOUBLE PRECISION,
    "percentage" DOUBLE PRECISION,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_token_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_metrics" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "contractId" TEXT,
    "price" DOUBLE PRECISION,
    "marketCap" DOUBLE PRECISION,
    "volume24h" DOUBLE PRECISION,
    "liquidity" DOUBLE PRECISION,
    "holders" INTEGER,
    "riskScore" INTEGER,
    "volatility24h" DOUBLE PRECISION,
    "priceChange24h" DOUBLE PRECISION,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "incidentType" "IncidentType" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "Severity" NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "network" "Network",
    "amount" TEXT,
    "currency" TEXT,
    "reportedBy" TEXT,
    "source" TEXT,
    "externalUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_entities" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "role" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incident_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SanctionedAddress" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SanctionedAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_findings" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "findingType" "FindingType" NOT NULL,
    "severity" "Severity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "details" JSONB,
    "confidence" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incident_findings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contracts_address_idx" ON "contracts"("address");

-- CreateIndex
CREATE INDEX "contracts_chainId_idx" ON "contracts"("chainId");

-- CreateIndex
CREATE INDEX "contracts_network_idx" ON "contracts"("network");

-- CreateIndex
CREATE INDEX "contracts_contractType_idx" ON "contracts"("contractType");

-- CreateIndex
CREATE INDEX "contracts_deployerAddress_idx" ON "contracts"("deployerAddress");

-- CreateIndex
CREATE INDEX "contracts_isActive_idx" ON "contracts"("isActive");

-- CreateIndex
CREATE INDEX "contracts_bytecodeHash_idx" ON "contracts"("bytecodeHash");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_chainId_address_key" ON "contracts"("chainId", "address");

-- CreateIndex
CREATE INDEX "contract_risk_scores_contractId_analyzedAt_idx" ON "contract_risk_scores"("contractId", "analyzedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_userId_idx" ON "api_keys"("userId");

-- CreateIndex
CREATE INDEX "market_events_tokenAddress_detectedAt_idx" ON "market_events"("tokenAddress", "detectedAt" DESC);

-- CreateIndex
CREATE INDEX "market_events_eventType_severity_idx" ON "market_events"("eventType", "severity");

-- CreateIndex
CREATE INDEX "wallet_reputation_scores_walletId_profiledAt_idx" ON "wallet_reputation_scores"("walletId", "profiledAt" DESC);

-- CreateIndex
CREATE INDEX "contract_findings_contractId_idx" ON "contract_findings"("contractId");

-- CreateIndex
CREATE INDEX "contract_findings_findingType_idx" ON "contract_findings"("findingType");

-- CreateIndex
CREATE INDEX "contract_findings_severity_idx" ON "contract_findings"("severity");

-- CreateIndex
CREATE INDEX "contract_findings_riskScore_idx" ON "contract_findings"("riskScore");

-- CreateIndex
CREATE INDEX "contract_findings_isActive_idx" ON "contract_findings"("isActive");

-- CreateIndex
CREATE INDEX "wallets_address_idx" ON "wallets"("address");

-- CreateIndex
CREATE INDEX "wallets_chainId_idx" ON "wallets"("chainId");

-- CreateIndex
CREATE INDEX "wallets_isBlacklisted_idx" ON "wallets"("isBlacklisted");

-- CreateIndex
CREATE INDEX "wallets_isWhitelisted_idx" ON "wallets"("isWhitelisted");

-- CreateIndex
CREATE INDEX "wallets_riskLevel_idx" ON "wallets"("riskLevel");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_chainId_address_key" ON "wallets"("chainId", "address");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_address_key" ON "tokens"("address");

-- CreateIndex
CREATE INDEX "tokens_address_idx" ON "tokens"("address");

-- CreateIndex
CREATE INDEX "tokens_network_idx" ON "tokens"("network");

-- CreateIndex
CREATE INDEX "tokens_symbol_idx" ON "tokens"("symbol");

-- CreateIndex
CREATE INDEX "tokens_isActive_idx" ON "tokens"("isActive");

-- CreateIndex
CREATE INDEX "wallet_token_relations_walletId_idx" ON "wallet_token_relations"("walletId");

-- CreateIndex
CREATE INDEX "wallet_token_relations_tokenId_idx" ON "wallet_token_relations"("tokenId");

-- CreateIndex
CREATE INDEX "wallet_token_relations_usdValue_idx" ON "wallet_token_relations"("usdValue");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_token_relations_walletId_tokenId_key" ON "wallet_token_relations"("walletId", "tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "token_metrics_tokenId_key" ON "token_metrics"("tokenId");

-- CreateIndex
CREATE INDEX "token_metrics_tokenId_idx" ON "token_metrics"("tokenId");

-- CreateIndex
CREATE INDEX "token_metrics_contractId_idx" ON "token_metrics"("contractId");

-- CreateIndex
CREATE INDEX "token_metrics_riskScore_idx" ON "token_metrics"("riskScore");

-- CreateIndex
CREATE INDEX "token_metrics_lastUpdated_idx" ON "token_metrics"("lastUpdated");

-- CreateIndex
CREATE INDEX "incidents_incidentType_idx" ON "incidents"("incidentType");

-- CreateIndex
CREATE INDEX "incidents_status_idx" ON "incidents"("status");

-- CreateIndex
CREATE INDEX "incidents_severity_idx" ON "incidents"("severity");

-- CreateIndex
CREATE INDEX "incidents_riskLevel_idx" ON "incidents"("riskLevel");

-- CreateIndex
CREATE INDEX "incidents_network_idx" ON "incidents"("network");

-- CreateIndex
CREATE INDEX "incidents_createdAt_idx" ON "incidents"("createdAt");

-- CreateIndex
CREATE INDEX "incidents_isActive_idx" ON "incidents"("isActive");

-- CreateIndex
CREATE INDEX "incident_entities_incidentId_idx" ON "incident_entities"("incidentId");

-- CreateIndex
CREATE INDEX "incident_entities_entityType_idx" ON "incident_entities"("entityType");

-- CreateIndex
CREATE INDEX "incident_entities_entityId_idx" ON "incident_entities"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "incident_entities_incidentId_entityType_entityId_key" ON "incident_entities"("incidentId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "SanctionedAddress_address_key" ON "SanctionedAddress"("address");

-- CreateIndex
CREATE INDEX "incident_findings_incidentId_idx" ON "incident_findings"("incidentId");

-- CreateIndex
CREATE INDEX "incident_findings_findingType_idx" ON "incident_findings"("findingType");

-- CreateIndex
CREATE INDEX "incident_findings_severity_idx" ON "incident_findings"("severity");

-- CreateIndex
CREATE INDEX "incident_findings_isActive_idx" ON "incident_findings"("isActive");

-- AddForeignKey
ALTER TABLE "contract_risk_scores" ADD CONSTRAINT "contract_risk_scores_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_reputation_scores" ADD CONSTRAINT "wallet_reputation_scores_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_findings" ADD CONSTRAINT "contract_findings_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_token_relations" ADD CONSTRAINT "wallet_token_relations_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_token_relations" ADD CONSTRAINT "wallet_token_relations_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_metrics" ADD CONSTRAINT "token_metrics_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_metrics" ADD CONSTRAINT "token_metrics_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_entities" ADD CONSTRAINT "incident_entities_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_entities" ADD CONSTRAINT "incident_entities_contractId_fkey" FOREIGN KEY ("entityId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_entities" ADD CONSTRAINT "incident_entities_walletId_fkey" FOREIGN KEY ("entityId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_findings" ADD CONSTRAINT "incident_findings_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
