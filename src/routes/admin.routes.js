const express = require('express');
const {
  getAllUsers,
  deleteUser,
  blockUser,
  unblockUser,
  deleteQuestionAdmin,
  deleteAnswerAdmin,
  getStats,
} = require('../controllers/admin.controller.js');
const { protect, restrictTo } = require('../middlewares/auth.js');
const validate = require('../middlewares/validate.js');
const { userIdParamSchema } = require('../validations/user.validation.js');
const { questionIdParamSchema } = require('../validations/question.validation.js');
const { answerIdParamSchema } = require('../validations/answer.validation.js');

const router = express.Router();

// Every route below requires an authenticated ADMIN.
router.use(protect, restrictTo('ADMIN'));

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: User management and platform statistics (admin only)
 */

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: List all users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated list of users
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not an admin
 */
router.get('/users', getAllUsers);

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   delete:
 *     summary: Delete a user (only if they have no existing content)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UserId'
 *     responses:
 *       200:
 *         description: User deleted
 *       404:
 *         description: User not found
 *       409:
 *         description: User has existing content and cannot be deleted
 */
router.delete('/users/:id', validate(userIdParamSchema), deleteUser);

/**
 * @swagger
 * /api/v1/admin/users/{id}/block:
 *   patch:
 *     summary: Block a user and revoke their active sessions
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UserId'
 *     responses:
 *       200:
 *         description: User blocked
 *       403:
 *         description: Cannot block an admin account
 *       404:
 *         description: User not found
 */
router.patch('/users/:id/block', validate(userIdParamSchema), blockUser);

/**
 * @swagger
 * /api/v1/admin/users/{id}/unblock:
 *   patch:
 *     summary: Unblock a user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/UserId'
 *     responses:
 *       200:
 *         description: User unblocked
 *       404:
 *         description: User not found
 */
router.patch('/users/:id/unblock', validate(userIdParamSchema), unblockUser);

/**
 * @swagger
 * /api/v1/admin/questions/{id}:
 *   delete:
 *     summary: Remove an inappropriate question
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/QuestionId'
 *     responses:
 *       200:
 *         description: Question removed
 *       404:
 *         description: Question not found
 */
router.delete('/questions/:id', validate(questionIdParamSchema), deleteQuestionAdmin);

/**
 * @swagger
 * /api/v1/admin/answers/{id}:
 *   delete:
 *     summary: Remove an inappropriate answer
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/AnswerId'
 *     responses:
 *       200:
 *         description: Answer removed
 *       404:
 *         description: Answer not found
 */
router.delete('/answers/:id', validate(answerIdParamSchema), deleteAnswerAdmin);

/**
 * @swagger
 * /api/v1/admin/stats:
 *   get:
 *     summary: Platform-wide statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aggregate counts across users, questions, answers, and reports
 */
router.get('/stats', getStats);

module.exports = router;
