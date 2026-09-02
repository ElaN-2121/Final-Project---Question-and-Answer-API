require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const { applySecurity, authLimiter } = require('./middlewares/security');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const swaggerSpec = require('./docs/swagger');
const apiRoutes = require('./routes');

const app = express();

// --- Core middleware ---
applySecurity(app); // helmet, cors, general rate limiting
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Apply the stricter auth limiter to auth routes specifically.
app.use('/api/v1/auth', authLimiter);

// --- Health check ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Swagger docs ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- API routes ---
app.use('/api/v1', apiRoutes);

// --- 404 + centralized error handler (always last) ---
app.use(notFound);
app.use(errorHandler);

module.exports = app;