const express = require('express');
const router = express.Router();

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