const { z } = require('zod');

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateQuestionInput:
 *       type: object
 *       additionalProperties: false
 *       required:
 *         - title
 *         - description
 *         - tags
 *       properties:
 *         title:
 *           type: string
 *           minLength: 10
 *           maxLength: 200
 *           example: "How does JWT authentication work in Node.js?"
 *         description:
 *           type: string
 *           minLength: 20
 *           example: "I am learning backend development and want to understand how JWT authentication and refresh tokens work together securely."
 *         tags:
 *           type: array
 *           minItems: 1
 *           maxItems: 5
 *           items:
 *             type: string
 *             minLength: 2
 *             maxLength: 30
 *           example: ["nodejs", "jwt", "authentication"]
 *     UpdateQuestionInput:
 *       type: object
 *       additionalProperties: false
 *       minProperties: 1
 *       properties:
 *         title:
 *           type: string
 *           minLength: 10
 *           maxLength: 200
 *           example: "How does JWT authentication work in Node.js and Express?"
 *         description:
 *           type: string
 *           minLength: 20
 *           example: "Updated description explaining token rotation and security best practices."
 *         tags:
 *           type: array
 *           minItems: 1
 *           maxItems: 5
 *           items:
 *             type: string
 *             minLength: 2
 *             maxLength: 30
 *           example: ["nodejs", "jwt", "express"]
 *   parameters:
 *     QuestionId:
 *       in: path
 *       name: id
 *       required: true
 *       description: Unique identifier of the question
 *       schema:
 *         type: string
 *         format: uuid
 *         example: "b3b2c1d0-4e5f-6a7b-8c9d-0e1f2a3b4c5d"
 *   responses:
 *     InvalidQuestionInput:
 *       description: Question data is missing, invalid, or outside the allowed length or tag limits
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: fail
 *               message:
 *                 type: string
 *                 example: Validation failed
 */

const questionTitleSchema = z
  .string({ required_error: 'Question title is required' })
  .trim()
  .min(10, 'Question title must be at least 10 characters')
  .max(200, 'Question title cannot exceed 200 characters');

const questionDescriptionSchema = z
  .string({ required_error: 'Question description is required' })
  .trim()
  .min(20, 'Question description must be at least 20 characters');

const questionTagSchema = z
  .string({ invalid_type_error: 'Each tag must be a string' })
  .trim()
  .toLowerCase()
  .min(2, 'Each tag must be at least 2 characters')
  .max(30, 'Each tag cannot exceed 30 characters')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Each tag may contain only lowercase letters, numbers, and optional hyphens'
  );

const questionTagsSchema = z
  .array(questionTagSchema, {
    required_error: 'At least one tag is required',
    invalid_type_error: 'Tags must be an array of strings',
  })
  .min(1, 'At least one tag is required')
  .max(5, 'A question cannot have more than 5 tags');

const createQuestionSchema = z.object({
  body: z
    .object({
      title: questionTitleSchema,
      description: questionDescriptionSchema,
      tags: questionTagsSchema,
    })
    .strict(),
});

const updateQuestionSchema = z.object({
  body: z
    .object({
      title: questionTitleSchema.optional(),
      description: questionDescriptionSchema.optional(),
      tags: questionTagsSchema.optional(),
    })
    .strict()
    .refine(
      (body) => Object.values(body).some((value) => value !== undefined),
      'At least one question field must be provided for an update'
    ),
});

const questionIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Question ID must be a valid UUID'),
  }),
});

module.exports = {
  createQuestionSchema,
  updateQuestionSchema,
  questionIdParamSchema,
};
