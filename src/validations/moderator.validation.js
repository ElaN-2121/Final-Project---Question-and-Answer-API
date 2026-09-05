const { z } = require('zod');

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateReportInput:
 *       type: object
 *       additionalProperties: false
 *       required:
 *         - reason
 *       properties:
 *         questionId:
 *           type: string
 *           format: uuid
 *           description: Provide this OR answerId, not both
 *         answerId:
 *           type: string
 *           format: uuid
 *           description: Provide this OR questionId, not both
 *         reason:
 *           type: string
 *           minLength: 5
 *           maxLength: 300
 *           example: "Contains spam links"
 *     ReviewReportInput:
 *       type: object
 *       additionalProperties: false
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [REVIEWED, REMOVED]
 *     SuspendUserInput:
 *       type: object
 *       additionalProperties: false
 *       required:
 *         - hours
 *       properties:
 *         hours:
 *           type: integer
 *           minimum: 1
 *           maximum: 720
 *           example: 24
 *         reason:
 *           type: string
 *           maxLength: 300
 */

const createReportSchema = z.object({
  body: z
    .object({
      questionId: z.string().uuid('Question ID must be a valid UUID').optional(),
      answerId: z.string().uuid('Answer ID must be a valid UUID').optional(),
      reason: z
        .string({ required_error: 'A reason is required' })
        .trim()
        .min(5, 'Reason must be at least 5 characters')
        .max(300, 'Reason cannot exceed 300 characters'),
    })
    .strict()
    .refine(
      (body) => Boolean(body.questionId) !== Boolean(body.answerId),
      'Provide exactly one of questionId or answerId'
    ),
});

const reviewReportSchema = z.object({
  params: z.object({
    id: z.string().uuid('Report ID must be a valid UUID'),
  }),
  body: z
    .object({
      status: z.enum(['REVIEWED', 'REMOVED'], {
        required_error: 'Status is required',
      }),
    })
    .strict(),
});

const removeContentParamSchema = z.object({
  params: z.object({
    type: z.enum(['question', 'answer'], {
      required_error: 'Content type is required',
      invalid_type_error: 'Content type must be "question" or "answer"',
    }),
    id: z.string().uuid('Content ID must be a valid UUID'),
  }),
});

const suspendUserSchema = z.object({
  params: z.object({
    id: z.string().uuid('User ID must be a valid UUID'),
  }),
  body: z
    .object({
      hours: z
        .number({ required_error: 'Suspension length in hours is required' })
        .int('Hours must be a whole number')
        .min(1, 'Suspension must be at least 1 hour')
        .max(720, 'Suspension cannot exceed 720 hours (30 days)'),
      reason: z.string().trim().max(300, 'Reason cannot exceed 300 characters').optional(),
    })
    .strict(),
});

module.exports = {
  createReportSchema,
  reviewReportSchema,
  removeContentParamSchema,
  suspendUserSchema,
};
