const { z } = require('zod');

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateCommentInput:
 *       type: object
 *       additionalProperties: false
 *       required:
 *         - content
 *       properties:
 *         content:
 *           type: string
 *           minLength: 1
 *           maxLength: 1000
 *           example: "Can you explain the refresh token part?"
 */

const createCommentSchema = z.object({
  body: z
    .object({
      content: z
        .string({ required_error: 'Comment content is required' })
        .trim()
        .min(1, 'Comment cannot be empty')
        .max(1000, 'Comment cannot exceed 1000 characters'),
    })
    .strict(),
});

const targetIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID must be a valid UUID'),
  }),
});

module.exports = { createCommentSchema, targetIdParamSchema };
