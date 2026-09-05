const express = require('express');
const { commentOnQuestion, commentOnAnswer } = require('../controllers/comments.controller.js');
const { protect } = require('../middlewares/auth.js');
const validate = require('../middlewares/validate.js');
const { createCommentSchema, targetIdParamSchema } = require('../validations/comment.validation.js');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Comments on questions and answers
 */

/**
 * @swagger
 * /api/v1/comments/questions/{id}:
 *   post:
 *     summary: Comment on a question
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCommentInput'
 *     responses:
 *       201:
 *         description: Comment created
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Question not found
 */
router.post(
  '/questions/:id',
  protect,
  validate(targetIdParamSchema),
  validate(createCommentSchema),
  commentOnQuestion
);

/**
 * @swagger
 * /api/v1/comments/answers/{id}:
 *   post:
 *     summary: Comment on an answer
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCommentInput'
 *     responses:
 *       201:
 *         description: Comment created
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Answer not found
 */
router.post(
  '/answers/:id',
  protect,
  validate(targetIdParamSchema),
  validate(createCommentSchema),
  commentOnAnswer
);

module.exports = router;
