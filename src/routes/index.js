const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Check API health
 *     tags:
 *       - Health
 *     security: []
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - status
 *                 - timestamp
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/health', (req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./users.routes'));
router.use('/questions', require('./questions.routes'));
router.use('/answers', require('./answers.routes'));
router.use('/comments', require('./comments.routes'));
router.use('/votes', require('./votes.routes'));
router.use('/tags', require('./tags.routes'));
router.use('/admin', require('./admin.routes'));
router.use('/moderator', require('./moderator.routes'));

module.exports = router;