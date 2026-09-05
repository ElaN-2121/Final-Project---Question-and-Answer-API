const { z } = require('zod');

/**
 * @swagger
 * components:
 *   schemas:
 *     VoteInput:
 *       type: object
 *       additionalProperties: false
 *       required:
 *         - type
 *       properties:
 *         type:
 *           type: string
 *           enum: [UPVOTE, DOWNVOTE]
 *           example: UPVOTE
 */

const voteSchema = z.object({
  body: z
    .object({
      type: z.enum(['UPVOTE', 'DOWNVOTE'], {
        required_error: 'Vote type is required',
        invalid_type_error: 'Vote type must be UPVOTE or DOWNVOTE',
      }),
    })
    .strict(),
});

const targetIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID must be a valid UUID'),
  }),
});

module.exports = { voteSchema, targetIdParamSchema };
