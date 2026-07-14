-- CreateTable
CREATE TABLE "admin_otp" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "otp" VARCHAR(6) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_otp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_otp_email_idx" ON "admin_otp"("email");

-- CreateIndex
CREATE INDEX "admin_otp_verified_idx" ON "admin_otp"("verified");

-- CreateIndex
CREATE UNIQUE INDEX "admin_otp_email_otp_key" ON "admin_otp"("email", "otp");
