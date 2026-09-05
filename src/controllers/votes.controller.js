/**
 * OWNER: Student B
 * Controller for /api/v1/votes
 *
 * Business rules added beyond the literal spec ("cannot vote multiple
 * times"):
 *  - Voting on your own content is blocked (standard Q&A platform
 *    practice, and prevents trivially farming reputation by
 *    upvoting/downvoting your own posts).
 *  - Casting the SAME vote type twice is rejected (409) rather than
 *    silently ignored.
 *  - Casting the OPPOSITE vote type (switching an upvote to a
 *    downvote or vice versa) is allowed and updates the existing
 *    vote row instead of creating a second one — the reputation
 *    delta accounts for both the removal of the old vote's effect
 *    and the application of the new one.
 */
const prisma = require('../config/prisma.js');
const AppError = require('../utils/AppError.js');
const { REPUTATION_POINTS, adjustReputation } = require('../utils/reputation.js');

const REPUTATION_BY_TYPE = {
  UPVOTE: REPUTATION_POINTS.RECEIVE_UPVOTE,
  DOWNVOTE: REPUTATION_POINTS.RECEIVE_DOWNVOTE,
};

const castVote = async (req, res, next, target) => {
  try {
    const { type } = req.body;
    const targetId = req.params.id;

    const record =
      target === 'question'
        ? await prisma.question.findFirst({
            where: { id: targetId, isDeleted: false },
            select: { id: true, authorId: true },
          })
        : await prisma.answer.findUnique({
            where: { id: targetId },
            select: { id: true, authorId: true },
          });

    if (!record) {
      return next(
        new AppError(`${target === 'question' ? 'Question' : 'Answer'} not found.`, 404)
      );
    }

    if (record.authorId === req.user.id) {
      return next(new AppError('You cannot vote on your own content.', 403));
    }

    const whereClause =
      target === 'question'
        ? { userId_questionId: { userId: req.user.id, questionId: targetId } }
        : { userId_answerId: { userId: req.user.id, answerId: targetId } };

    const existingVote = await prisma.vote.findUnique({ where: whereClause });

    const vote = await prisma.$transaction(async (transaction) => {
      if (!existingVote) {
        const created = await transaction.vote.create({
          data: {
            userId: req.user.id,
            type,
            ...(target === 'question' ? { questionId: targetId } : { answerId: targetId }),
          },
        });
        await adjustReputation(transaction, record.authorId, REPUTATION_BY_TYPE[type]);
        return created;
      }

      if (existingVote.type === type) {
        throw new AppError('You have already cast this vote.', 409);
      }

      const updated = await transaction.vote.update({
        where: whereClause,
        data: { type },
      });

      // Reverse the old delta, apply the new one, in one increment.
      const delta = REPUTATION_BY_TYPE[type] - REPUTATION_BY_TYPE[existingVote.type];
      await adjustReputation(transaction, record.authorId, delta);

      return updated;
    });

    res.status(200).json({ status: 'success', data: { vote } });
  } catch (error) {
    next(error);
  }
};

const voteOnQuestion = (req, res, next) => castVote(req, res, next, 'question');
const voteOnAnswer = (req, res, next) => castVote(req, res, next, 'answer');

module.exports = { voteOnQuestion, voteOnAnswer };
