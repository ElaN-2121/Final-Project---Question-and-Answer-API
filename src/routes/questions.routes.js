const express = require('express');
const {
	createQuestion,
	getQuestions,
	getQuestionById,
	updateQuestion,
	deleteQuestion,
} = require('../controllers/questions.controller.js');
const { protect } = require('../middlewares/auth.js');
const validate = require('../middlewares/validate.js');
const {
	createQuestionSchema,
	updateQuestionSchema,
	questionIdParamSchema,
} = require('../validations/question.validation.js');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Questions
 *   description: Questions and their associated answers, comments, votes, and tags
 */

/**
 * @swagger
 * /api/v1/questions:
 *   post:
 *     summary: Create a new question
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateQuestionInput'
 *     responses:
 *       201:
 *         description: Question created with attached tags and sanitized author
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 question:
 *                   id: "b3b2c1d0-4e5f-6a7b-8c9d-0e1f2a3b4c5d"
 *                   title: "How does JWT authentication work in Node.js?"
 *                   description: "I am learning backend development and want to understand how JWT authentication and refresh tokens work together securely."
 *                   author:
 *                     id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
 *                     name: "Ada Lovelace"
 *                     profileImageUrl: null
 *                     reputation: 125
 *                   tags:
 *                     - tag:
 *                         id: "c1d2e3f4-5678-4abc-9def-0123456789ab"
 *                         name: "nodejs"
 *       400:
 *         description: Validation failure
 *       401:
 *         description: Missing or invalid token
 */
router.post('/', protect, validate(createQuestionSchema), createQuestion);

/**
 * @swagger
 * /api/v1/questions:
 *   get:
 *     summary: Get all active questions
 *     tags: [Questions]
 *     security: []
 *     responses:
 *       200:
 *         description: Active question summaries with authors, tags, and activity counts
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 questions:
 *                   - id: "b3b2c1d0-4e5f-6a7b-8c9d-0e1f2a3b4c5d"
 *                     title: "How does JWT authentication work in Node.js?"
 *                     description: "I am learning backend development and want to understand how JWT authentication and refresh tokens work together securely."
 *                     author:
 *                       id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
 *                       name: "Ada Lovelace"
 *                       profileImageUrl: null
 *                       reputation: 125
 *                     tags:
 *                       - tag:
 *                           id: "c1d2e3f4-5678-4abc-9def-0123456789ab"
 *                           name: "nodejs"
 *                     _count:
 *                       answers: 3
 *                       votes: 8
 *                       comments: 2
 */
router.get('/', getQuestions);

/**
 * @swagger
 * /api/v1/questions/{id}:
 *   get:
 *     summary: Get question details by ID
 *     tags: [Questions]
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/QuestionId'
 *     responses:
 *       200:
 *         description: Full question detail with answers, comments, votes, and vote totals
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 question:
 *                   id: "b3b2c1d0-4e5f-6a7b-8c9d-0e1f2a3b4c5d"
 *                   title: "How does JWT authentication work in Node.js?"
 *                   author:
 *                     id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
 *                     name: "Ada Lovelace"
 *                   tags: []
 *                   answers: []
 *                   comments: []
 *                   _count:
 *                     answers: 0
 *                     votes: 2
 *                     comments: 0
 *                   voteTotals:
 *                     upvotes: 2
 *                     downvotes: 0
 *       404:
 *         description: Question does not exist or is deleted
 *         content:
 *           application/json:
 *             example:
 *               status: fail
 *               message: "Question not found."
 */
router.get('/:id', validate(questionIdParamSchema), getQuestionById);

/**
 * @swagger
 * /api/v1/questions/{id}:
 *   patch:
 *     summary: Update an existing question (Author only)
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/QuestionId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateQuestionInput'
 *           example:
 *             title: "How does JWT authentication work in Node.js and Express?"
 *             description: "Updated description explaining token rotation and security best practices."
 *             tags: ["nodejs", "jwt", "express"]
 *     responses:
 *       200:
 *         description: Updated question object
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               data:
 *                 question:
 *                   id: "b3b2c1d0-4e5f-6a7b-8c9d-0e1f2a3b4c5d"
 *                   title: "How does JWT authentication work in Node.js and Express?"
 *                   description: "Updated description explaining token rotation and security best practices."
 *                   tags: []
 *       400:
 *         description: Validation failure or empty body
 *         content:
 *           application/json:
 *             example:
 *               status: fail
 *               message: "At least one question field must be provided for an update"
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             example:
 *               status: fail
 *               message: "You are not logged in. Please log in to get access."
 *       403:
 *         description: User is not the author
 *         content:
 *           application/json:
 *             example:
 *               status: fail
 *               message: "You can only update your own questions."
 *       404:
 *         description: Question not found
 *         content:
 *           application/json:
 *             example:
 *               status: fail
 *               message: "Question not found."
 */
router.patch('/:id', protect, validate(questionIdParamSchema), validate(updateQuestionSchema), updateQuestion);

/**
 * @swagger
 * /api/v1/questions/{id}:
 *   delete:
 *     summary: Soft delete a question (Author, Admin, or Moderator)
 *     tags: [Questions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/QuestionId'
 *     responses:
 *       200:
 *         description: Deletion success confirmation
 *         content:
 *           application/json:
 *             example:
 *               status: success
 *               message: "Question deleted successfully."
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Unauthorized to delete
 *         content:
 *           application/json:
 *             example:
 *               status: fail
 *               message: "You do not have permission to delete this question."
 *       404:
 *         description: Question not found
 *         content:
 *           application/json:
 *             example:
 *               status: fail
 *               message: "Question not found."
 */
router.delete('/:id', protect, validate(questionIdParamSchema), deleteQuestion);

module.exports = router;
