const express = require('express');
const { createTag, getTags } = require('../controllers/tags.controller.js');
const { protect } = require('../middlewares/auth.js');
const validate = require('../middlewares/validate.js');
const { createTagSchema } = require('../validations/tag.validation.js');

const router = express.Router();

/**
 * @swagger
 * /api/v1/tags:
 *   post:
 *     summary: Create a tag
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTagInput'
 *     responses:
 *       201:
 *         description: Tag created successfully
 *       400:
 *         description: Invalid tag name
 *       401:
 *         description: Authentication required
 *       409:
 *         description: A tag with this name already exists
 */
router.post('/', protect, validate(createTagSchema), createTag);

/**
 * @swagger
 * /api/v1/tags:
 *   get:
 *     summary: List all tags with question usage counts
 *     tags: [Tags]
 *     security: []
 *     responses:
 *       200:
 *         description: Tags retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - status
 *                 - data
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: object
 *                         required:
 *                           - id
 *                           - name
 *                           - _count
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                             example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
 *                           name:
 *                             type: string
 *                             example: "nodejs"
 *                           _count:
 *                             type: object
 *                             properties:
 *                               posts:
 *                                 type: integer
 *                                 example: 12
 */
router.get('/', getTags);

module.exports = router;
