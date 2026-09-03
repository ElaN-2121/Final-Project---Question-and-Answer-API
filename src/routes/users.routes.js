const express = require('express');
const {
	getUserById,
	updateMe,
	uploadAvatar,
} = require('../controllers/users.controller.js');
const { protect } = require('../middlewares/auth.js');
const {
	updateProfileSchema,
	userIdParamSchema,
} = require('../validations/user.validation.js');
const { uploadAvatar: uploadAvatarMiddleware } = require('../middlewares/upload.js');
const validate = require('../middlewares/validate.js');

const router = express.Router();

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get a user's public profile and activity statistics
 *     tags: [Users]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Unique identifier of the user
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       404:
 *         description: User not found
 */
router.get('/:id', validate(userIdParamSchema), getUserById);

/**
 * @swagger
 * /api/v1/users/update-me:
 *   patch:
 *     summary: Update the authenticated user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileInput'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Authentication required
 */
router.patch('/update-me', protect, validate(updateProfileSchema), updateMe);

/**
 * @swagger
 * /api/v1/users/avatar:
 *   patch:
 *     summary: Upload an avatar for the authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/AvatarUploadInput'
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 *       400:
 *         description: A supported avatar image is required
 *       401:
 *         description: Authentication required
 *       413:
 *         description: Avatar image exceeds the 2MB limit
 */
router.patch('/avatar', protect, uploadAvatarMiddleware, uploadAvatar);

module.exports = router;
