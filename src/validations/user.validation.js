const { z } = require('zod');

/**
 * @swagger
 * components:
 *   schemas:
 *     UpdateProfileInput:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           example: "Alemu Getu"
 *         bio:
 *           type: string
 *           maxLength: 300
 *           example: "Full-stack developer passionate about Node.js and distributed systems."
 *     AvatarUploadInput:
 *       type: object
 *       required:
 *         - avatar
 *       properties:
 *         avatar:
 *           type: string
 *           format: binary
 *           description: JPEG, PNG, or WebP avatar image up to 2MB
 *   parameters:
 *     UserId:
 *       in: path
 *       name: id
 *       required: true
 *       description: Unique identifier of the user
 *       schema:
 *         type: string
 *         format: uuid
 *         example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
 */

const updateProfileSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(2, 'Name must be at least 2 characters')
        .max(50, 'Name cannot exceed 50 characters')
        .optional(),
      bio: z
        .string()
        .trim()
        .max(300, 'Bio cannot exceed 300 characters')
        .optional(),
    })
    .strict(),
});

const userIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('User ID must be a valid UUID'),
  }),
});

module.exports = {
  updateProfileSchema,
  userIdParamSchema,
};
