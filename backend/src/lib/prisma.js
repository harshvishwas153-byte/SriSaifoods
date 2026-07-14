// A single shared PrismaClient instance for the whole app.
//
// Why this file exists: creating a new PrismaClient() in every file
// that needs the database opens a new connection pool each time. In
// development, nodemon restarts can pile up connections fast. Storing
// the client on `global` guarantees only one instance ever exists per
// running process.

const { PrismaClient } = require("@prisma/client");
const { NODE_ENV } = require("../config/env");

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.__prisma ||
  new PrismaClient({
    log: NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}

module.exports = prisma;
