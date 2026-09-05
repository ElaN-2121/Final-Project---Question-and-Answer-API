const { z } = require('zod');

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateAnswerInput:
 *       type: object
 *       additionalProperties: false
 *       required:
 *         - questionId
 *         - content
 *       properties:
 *         questionId:
 *           type: string
 *           format: uuid
 *           example: "b3b2c1d0-4e5f-6a7b-8c9d-0e1f2a3b4c5d"
 *         content:
 *           type: string
 *           minLength: 20
 *           example: "JWT is commonly used to securely transfer claims between two parties using a signed token."
 *     UpdateAnswerInput:
 *       type: object
 *       additionalProperties: false
 *       required:
 *         - content
 *       properties:
 *         content:
 *           type: string
 *           minLength: 20
 *   parameters:
 *     AnswerId:
 *       in: path
 *       name: id
 *       required: true
 *       description: Unique identifier of the answer
 *       schema:
 *         type: string
 *         format: uuid
 */

const createAnswerSchema = z.object({
  body: z
    .object({
      questionId: z.string({ required_error: 'Question ID is required' }).uuid('Question ID must be a valid UUID'),
      content: z
        .string({ required_error: 'Answer content is required' })
        .trim()
        .min(20, 'Answer must be at least 20 characters'),
    })
    .strict(),
});

const updateAnswerSchema = z.object({
  body: z
    .object({
      content: z
        .string({ required_error: 'Answer content is required' })
        .trim()
        .min(20, 'Answer must be at least 20 characters'),
    })
    .strict(),
});

const answerIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Answer ID must be a valid UUID'),
  }),
});

module.exports = { createAnswerSchema, updateAnswerSchema, answerIdParamSchema };
