const { z } = require('zod');

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateTagInput:
 *       type: object
 *       additionalProperties: false
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 30
 *           pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$'
 *           description: Lowercase alphanumeric tag name with optional hyphens
 *           example: "nodejs"
 *   responses:
 *     InvalidTagInput:
 *       description: Tag name is missing, too short, too long, or has an invalid format
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
 *               details:
 *                 type: array
 *                 items:
 *                   type: object
 *                 example:
 *                   - path: [body, name]
 *                     message: Tag name may contain only lowercase letters, numbers, and optional hyphens
 */

const createTagSchema = z.object({
  body: z
    .object({
      name: z
        .string({ required_error: 'Tag name is required' })
        .trim()
        .toLowerCase()
        .min(2, 'Tag name must be at least 2 characters')
        .max(30, 'Tag name cannot exceed 30 characters')
        .regex(
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
          'Tag name may contain only lowercase letters, numbers, and optional hyphens'
        ),
    })
    .strict(),
});

const tagIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Tag ID must be a valid UUID'),
  }),
});

module.exports = {
  createTagSchema,
  tagIdParamSchema,
};
