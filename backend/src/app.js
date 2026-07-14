// Builds and configures the Express app, but does NOT call
// app.listen() — that happens in server.js. Keeping them separate
// means this file can be imported by automated tests (e.g. with
// supertest) without actually opening a network port.

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { CORS_ORIGIN, NODE_ENV } = require("./config/env");
const rewardRoutes = require("./routes/reward.routes");
const adminRoutes = require("./routes/admin.routes");
const adminRewardsRoutes = require("./routes/admin-rewards.routes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// ---- Security & parsing middleware ----
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());
app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

// ---- Health check (useful for uptime monitors / load balancers) ----
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ---- Routes ----
app.use("/api/reward", rewardRoutes);
app.use("/api/admin/reward", adminRoutes);
app.use("/api/admin/rewards", adminRewardsRoutes);

// ---- 404 + error handling (must be registered last) ----
app.use(notFound);
app.use(errorHandler);

module.exports = app;
