// Populates the database with sample reward QR tokens so the two
// public APIs (GET /api/reward/:token and POST /api/reward/claim)
// have something to test against right after setup.
//
// Run with: npm run seed

const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

const REWARD_EXPIRY_DAYS = Number(process.env.REWARD_EXPIRY_DAYS || 90);
const CASHBACK_AMOUNTS = [5, 10, 20, 50, 100]; // matches the reward cards on rewards.html
const TOKENS_PER_AMOUNT = 3;

function generateToken() {
  return crypto.randomBytes(12).toString("hex"); // 24-character unique token
}

async function main() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REWARD_EXPIRY_DAYS);

  const alreadyExpired = new Date();
  alreadyExpired.setDate(alreadyExpired.getDate() - 1);

  const rows = [];

  CASHBACK_AMOUNTS.forEach((amount) => {
    for (let i = 0; i < TOKENS_PER_AMOUNT; i++) {
      rows.push({
        token: generateToken(),
        cashbackAmount: amount,
        campaign: "launch-2026",
        expiresAt,
      });
    }
  });

  // One already-expired token and one pre-redeemed token, so all
  // three response states (active / redeemed / expired) are testable.
  const expiredToken = generateToken();
  const redeemedToken = generateToken();

  rows.push({
    token: expiredToken,
    cashbackAmount: 10,
    campaign: "launch-2026",
    expiresAt: alreadyExpired,
    status: "EXPIRED",
  });

  rows.push({
    token: redeemedToken,
    cashbackAmount: 20,
    campaign: "launch-2026",
    expiresAt,
    status: "REDEEMED",
    redeemedAt: new Date(),
    redeemedUpiId: "demo.user@upi",
  });

  await prisma.rewardQR.createMany({ data: rows });

  console.log(`Seeded ${rows.length} reward QR tokens.\n`);
  console.log("Sample tokens you can test with:");
  console.log(` - Active (₹${rows[0].cashbackAmount}): ${rows[0].token}`);
  console.log(` - Expired:  ${expiredToken}`);
  console.log(` - Redeemed: ${redeemedToken}`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
