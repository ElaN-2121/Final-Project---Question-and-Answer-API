const express = require('express');
const {
  createAnswer,
  updateAnswer,
  deleteAnswer,
  acceptAnswer,
} = require('../controllers/answers.controller.js');
const { protect } = require('../middlewares/auth.js');
const validate = require('../middlewares/validate.js');
const {
  createAnswerSchema,
  updateAnswerSchema,
  answerIdParamSchema,
} = require('../validations/answer.validation.js');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Answers
 *   description: Answers to questions, including accepting a best answer
 */

/**
 * @swagger
 * /api/v1/answers:
 *   post:
 *     summary: Submit an answer to a question
 *     tags: [Answers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAnswerInput'
 *     responses:
 *       201:
 *         description: Answer created
 *       400:
 *         description: Validation failure
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Question not found
 */
router.post('/', protect, validate(createAnswerSchema), createAnswer);

/**
 * @swagger
 * /api/v1/answers/{id}:
 *   patch:
 *     summary: Update your own answer
 *     tags: [Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/AnswerId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAnswerInput'
 *     responses:
 *       200:
 *         description: Answer updated
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not the answer's author
 *       404:
 *         description: Answer not found
 */
router.patch(
  '/:id',
  protect,
  validate(answerIdParamSchema),
  validate(updateAnswerSchema),
  updateAnswer
);

/**
 * @swagger
 * /api/v1/answers/{id}:
 *   delete:
 *     summary: Delete an answer (author, admin, or moderator)
 *     tags: [Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/AnswerId'
 *     responses:
 *       200:
 *         description: Answer deleted
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not permitted
 *       404:
 *         description: Answer not found
 */
router.delete('/:id', protect, validate(answerIdParamSchema), deleteAnswer);

/**
 * @swagger
 * /api/v1/answers/{id}/accept:
 *   patch:
 *     summary: Accept an answer (question owner only)
 *     tags: [Answers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/AnswerId'
 *     responses:
 *       200:
 *         description: Answer accepted; any previously accepted answer for the same question is unaccepted
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not the question owner
 *       404:
 *         description: Answer or question not found
 */
router.patch('/:id/accept', protect, validate(answerIdParamSchema), acceptAnswer);

module.exports = router;
