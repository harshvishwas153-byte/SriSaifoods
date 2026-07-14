// A small Error subclass that carries an HTTP status code, so
// controllers can `throw new ApiError(404, 'not found')` and the
// central error handler will respond with the right status.

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
