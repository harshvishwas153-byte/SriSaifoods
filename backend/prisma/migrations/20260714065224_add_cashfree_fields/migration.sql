-- AlterTable
ALTER TABLE "reward_qr" ADD COLUMN     "cashfree_reference_id" VARCHAR(100),
ADD COLUMN     "cashfree_transfer_id" VARCHAR(100),
ADD COLUMN     "payout_status" VARCHAR(50) DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "reward_qr_payout_status_idx" ON "reward_qr"("payout_status");
