const AppError = require('../utils/AppError');

// 404 handler — mount this AFTER all routes.
function notFound(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

// Known Prisma error codes worth turning into friendly responses.
function handlePrismaError(err) {
  if (err.code === 'P2002') {
    const field = err.meta?.target?.join(', ') || 'field';
    return new AppError(`Duplicate value for unique field: ${field}`, 409);
  }
  if (err.code === 'P2025') {
    return new AppError('Record not found', 404);
  }
  if (err.code === 'P2003') {
    return new AppError('Invalid reference to a related record', 400);
  }
  return null;
}

// Centralized error handler — mount this LAST, after notFound.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  if (error.code && error.code.startsWith('P')) {
    error = handlePrismaError(error) || error;
  }

  if (error.name === 'ZodError') {
    error = new AppError('Validation failed', 422, error.issues);
  }

  if (error.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token', 401);
  }
  if (error.name === 'TokenExpiredError') {
    error = new AppError('Token expired', 401);
  }

  const statusCode = error.statusCode || 500;
  const isOperational = error.isOperational || false;

  if (process.env.NODE_ENV === 'development') {
    console.error(err);
  }

  res.status(statusCode).json({
    status: error.status || 'error',
    message: isOperational ? error.message : 'Something went wrong',
    ...(error.details ? { details: error.details } : {}),
    ...(process.env.NODE_ENV === 'development' && !isOperational
      ? { stack: err.stack }
      : {}),
  });
}

module.exports = { notFound, errorHandler };