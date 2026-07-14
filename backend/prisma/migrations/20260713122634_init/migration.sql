-- CreateEnum
CREATE TYPE "RewardStatus" AS ENUM ('ACTIVE', 'REDEEMED', 'EXPIRED');

-- CreateTable
CREATE TABLE "reward_qr" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "cashback_amount" INTEGER NOT NULL,
    "status" "RewardStatus" NOT NULL DEFAULT 'ACTIVE',
    "campaign" VARCHAR(120),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemed_at" TIMESTAMP(3),
    "redeemed_upi_id" VARCHAR(120),
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "reward_qr_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reward_qr_token_key" ON "reward_qr"("token");

-- CreateIndex
CREATE INDEX "reward_qr_status_idx" ON "reward_qr"("status");
