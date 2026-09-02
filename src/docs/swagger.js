const swaggerJsdoc = require('swagger-jsdoc');

// Base config only. Each of us documents your own routes using JSDoc
// @swagger comments directly above each route handler in your route
// files — that's what `apis` below scans, so you never need to touch
// this file to add your own docs.
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'KnowledgeHub API',
      version: '1.0.0',
      description: 'Question & Answer platform backend API',
    },
    servers: [
      { url: 'http://localhost:4000/api/v1', description: 'Local dev' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;