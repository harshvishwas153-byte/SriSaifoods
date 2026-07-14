// Express recognizes this as an error-handling middleware because it
// takes 4 arguments (err, req, res, next). Any error thrown or passed
// to next(err) anywhere in the app ends up here.

const { NODE_ENV } = require("../config/env");

module.exports = function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const statusCode = err.statusCode || 500;

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    error: err.message || "Internal server error",
    ...(NODE_ENV === "development" && statusCode >= 500 ? { stack: err.stack } : {}),
  });
};
