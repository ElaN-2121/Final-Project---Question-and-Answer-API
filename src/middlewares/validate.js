/**
 * Shared Zod validation middleware. Both of us use this the same way
 * so validation errors come back in a consistent shape (handled by
 * errorHandler.js, which already knows how to format ZodError).
 *
 * Usage:
 *   const { z } = require('zod');
 *   const validate = require('../middlewares/validate');
 *
 *   const createQuestionSchema = z.object({
 *     body: z.object({
 *       title: z.string().min(10).max(200),
 *       description: z.string().min(20),
 *       tags: z.array(z.string()).min(1),
 *     }),
 *   });
 *
 *   router.post('/questions', validate(createQuestionSchema), createQuestion);
 */
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (err) {
    next(err); // ZodError is handled centrally in errorHandler.js
  }
};

module.exports = validate;