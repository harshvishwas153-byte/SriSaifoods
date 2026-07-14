const app = require("./app");
const { PORT, NODE_ENV } = require("./config/env");

const server = app.listen(PORT, () => {
  console.log(`Sri Sai Rewards API listening on port ${PORT} [${NODE_ENV}]`);
});

// Prevent the process from silently dying on an unhandled promise
// rejection (e.g. a missed .catch() somewhere) — log it and shut
// down cleanly instead of continuing in a broken state.
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  server.close(() => process.exit(1));
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => process.exit(0));
});
