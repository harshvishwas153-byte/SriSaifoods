// Runs when a request doesn't match any route defined in app.js.
// Must be registered AFTER all routes and BEFORE errorHandler.

module.exports = function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};
