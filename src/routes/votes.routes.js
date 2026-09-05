const express = require('express');
const { voteOnQuestion, voteOnAnswer } = require('../controllers/votes.controller.js');
const { protect } = require('../middlewares/auth.js');
const validate = require('../middlewares/validate.js');
const { voteSchema, targetIdParamSchema } = require('../validations/vote.validation.js');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Votes
 *   description: Upvoting and downvoting questions and answers
 */

/**
 * @swagger
 * /api/v1/votes/questions/{id}:
 *   post:
 *     summary: Vote on a question
 *     tags: [Votes]
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
 *             $ref: '#/components/schemas/VoteInput'
 *     responses:
 *       200:
 *         description: Vote recorded, or updated if switching vote type
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Cannot vote on your own content
 *       404:
 *         description: Question not found
 *       409:
 *         description: You already cast this exact vote
 */
router.post('/questions/:id', protect, validate(targetIdParamSchema), validate(voteSchema), voteOnQuestion);

/**
 * @swagger
 * /api/v1/votes/answers/{id}:
 *   post:
 *     summary: Vote on an answer
 *     tags: [Votes]
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
 *             $ref: '#/components/schemas/VoteInput'
 *     responses:
 *       200:
 *         description: Vote recorded, or updated if switching vote type
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Cannot vote on your own content
 *       404:
 *         description: Answer not found
 *       409:
 *         description: You already cast this exact vote
 */
router.post('/answers/:id', protect, validate(targetIdParamSchema), validate(voteSchema), voteOnAnswer);

module.exports = router;
