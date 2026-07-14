// Express does not automatically catch rejected promises thrown inside
// `async` route handlers. Wrapping a handler with asyncHandler makes
// sure any thrown error (or rejected promise) is passed to next(),
// so it reaches errorHandler.js instead of crashing the process.
//
// Usage:
//   router.get('/:token', asyncHandler(async (req, res) => { ... }));

module.exports = function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
