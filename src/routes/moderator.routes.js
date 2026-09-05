const express = require('express');
const {
  createReport,
  getReports,
  reviewReport,
  removeContent,
  suspendUser,
} = require('../controllers/moderator.controller.js');
const { protect, restrictTo } = require('../middlewares/auth.js');
const validate = require('../middlewares/validate.js');
const {
  createReportSchema,
  reviewReportSchema,
  removeContentParamSchema,
  suspendUserSchema,
} = require('../validations/moderator.validation.js');

const router = express.Router();

// Every route needs authentication; only some need MODERATOR/ADMIN,
// so restrictTo is applied per-route below rather than with router.use.
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Moderator
 *   description: Content reports and moderation actions
 */

/**
 * @swagger
 * /api/v1/moderator/reports:
 *   post:
 *     summary: Report a question or answer (any authenticated user)
 *     tags: [Moderator]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateReportInput'
 *     responses:
 *       201:
 *         description: Report filed
 *       400:
 *         description: Validation failure — provide exactly one of questionId or answerId
 *       404:
 *         description: Reported content not found
 */
router.post('/reports', validate(createReportSchema), createReport);

/**
 * @swagger
 * /api/v1/moderator/reports:
 *   get:
 *     summary: List reports (moderator/admin only)
 *     tags: [Moderator]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, REVIEWED, REMOVED]
 *           default: PENDING
 *     responses:
 *       200:
 *         description: Reports matching the given status, oldest first
 *       403:
 *         description: Not a moderator or admin
 */
router.get('/reports', restrictTo('MODERATOR', 'ADMIN'), getReports);

/**
 * @swagger
 * /api/v1/moderator/reports/{id}/review:
 *   patch:
 *     summary: Mark a report as reviewed or removed
 *     tags: [Moderator]
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
 *             $ref: '#/components/schemas/ReviewReportInput'
 *     responses:
 *       200:
 *         description: Report updated
 *       403:
 *         description: Not a moderator or admin
 *       404:
 *         description: Report not found
 */
router.patch(
  '/reports/:id/review',
  restrictTo('MODERATOR', 'ADMIN'),
  validate(reviewReportSchema),
  reviewReport
);

/**
 * @swagger
 * /api/v1/moderator/content/{type}/{id}:
 *   delete:
 *     summary: Remove reported content and resolve any pending reports on it
 *     tags: [Moderator]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [question, answer]
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Content removed
 *       403:
 *         description: Not a moderator or admin
 *       404:
 *         description: Content not found
 */
router.delete(
  '/content/:type/:id',
  restrictTo('MODERATOR', 'ADMIN'),
  validate(removeContentParamSchema),
  removeContent
);

/**
 * @swagger
 * /api/v1/moderator/users/{id}/suspend:
 *   patch:
 *     summary: Temporarily suspend a user and revoke their active sessions
 *     tags: [Moderator]
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
 *             $ref: '#/components/schemas/SuspendUserInput'
 *     responses:
 *       200:
 *         description: User suspended until the computed expiry time
 *       403:
 *         description: Not a moderator/admin, or target is an admin/moderator account
 *       404:
 *         description: User not found
 */
router.patch(
  '/users/:id/suspend',
  restrictTo('MODERATOR', 'ADMIN'),
  validate(suspendUserSchema),
  suspendUser
);

module.exports = router;
