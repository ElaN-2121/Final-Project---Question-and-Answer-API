const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// General API rate limiter — apply globally.
const generalLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'fail', message: 'Too many requests, please try again later.' },
});

// Stricter limiter for auth-sensitive routes (login/register/forgot-password).
const authLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'fail', message: 'Too many attempts, please try again later.' },
});

const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true,
};

function applySecurity(app) {
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(generalLimiter);
}

module.exports = { applySecurity, authLimiter };