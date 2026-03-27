-- AlterTable
ALTER TABLE "wallet_reputation_scores" ADD COLUMN     "archetype" TEXT,
ADD COLUMN     "classification" TEXT,
ADD COLUMN     "confidenceScore" DOUBLE PRECISION,
ADD COLUMN     "jobId" TEXT;

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "walletType" TEXT;

-- CreateTable
CREATE TABLE "sanctioned_addresses" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "source" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sanctioned_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sanctioned_addresses_address_key" ON "sanctioned_addresses"("address");

-- CreateIndex
CREATE INDEX "sanctioned_addresses_address_idx" ON "sanctioned_addresses"("address");
