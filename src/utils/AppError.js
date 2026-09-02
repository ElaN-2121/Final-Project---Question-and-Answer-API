/**
 * Standard error type for anything we throw deliberately (validation
 * failures, auth failures, not-found, forbidden, etc).
 *
 * Usage:
 *   throw new AppError('Question not found', 404);
 *   throw new AppError('You do not own this question', 403);
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;