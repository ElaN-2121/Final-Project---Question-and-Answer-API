/**
 * OWNER: Student B
 * Controller for /api/v1/answers
 */
const prisma = require('../config/prisma.js');
const AppError = require('../utils/AppError.js');
const { REPUTATION_POINTS, adjustReputation } = require('../utils/reputation.js');
const { sendNotificationEmail } = require('../utils/notify.js');
const { hardDeleteAnswer } = require('../utils/cascadeDelete.js');

const authorSelect = {
  id: true,
  name: true,
  profileImageUrl: true,
  reputation: true,
};

const createAnswer = async (req, res, next) => {
  try {
    const { questionId, content } = req.body;

    const question = await prisma.question.findFirst({
      where: { id: questionId, isDeleted: false },
      select: { id: true, title: true, authorId: true },
    });

    if (!question) {
      return next(new AppError('Question not found.', 404));
    }

    const answer = await prisma.$transaction(async (transaction) => {
      const createdAnswer = await transaction.answer.create({
        data: { content, questionId, authorId: req.user.id },
      });

      await adjustReputation(transaction, req.user.id, REPUTATION_POINTS.ANSWER_QUESTION);

      return transaction.answer.findUnique({
        where: { id: createdAnswer.id },
        include: { author: { select: authorSelect } },
      });
    });

    // Notify the question owner. Best-effort — never blocks the response.
    if (question.authorId !== req.user.id) {
      const owner = await prisma.user.findUnique({
        where: { id: question.authorId },
        select: { email: true, name: true },
      });
      if (owner) {
        sendNotificationEmail({
          to: owner.email,
          subject: 'New answer on your KnowledgeHub question',
          text: `${req.user.name} answered your question "${question.title}".`,
          html: `<p><strong>${req.user.name}</strong> answered your question "<strong>${question.title}</strong>".</p>`,
        });
      }
    }

    res.status(201).json({ status: 'success', data: { answer } });
  } catch (error) {
    next(error);
  }
};

const updateAnswer = async (req, res, next) => {
  try {
    const answer = await prisma.answer.findUnique({
      where: { id: req.params.id },
      select: { id: true, authorId: true },
    });

    if (!answer) {
      return next(new AppError('Answer not found.', 404));
    }

    if (answer.authorId !== req.user.id) {
      return next(new AppError('You can only update your own answers.', 403));
    }

    const updatedAnswer = await prisma.answer.update({
      where: { id: answer.id },
      data: { content: req.body.content },
      include: { author: { select: authorSelect } },
    });

    res.status(200).json({ status: 'success', data: { answer: updatedAnswer } });
  } catch (error) {
    next(error);
  }
};

const deleteAnswer = async (req, res, next) => {
  try {
    const answer = await prisma.answer.findUnique({
      where: { id: req.params.id },
      select: { id: true, authorId: true },
    });

    if (!answer) {
      return next(new AppError('Answer not found.', 404));
    }

    const canDelete =
      answer.authorId === req.user.id || ['ADMIN', 'MODERATOR'].includes(req.user.role);

    if (!canDelete) {
      return next(new AppError('You do not have permission to delete this answer.', 403));
    }

    // Answer has no soft-delete flag in the schema (unlike Question),
    // so this is a real delete — see utils/cascadeDelete.js for why
    // dependent rows have to be cleaned up first.
    await prisma.$transaction(async (transaction) => {
      await hardDeleteAnswer(transaction, answer.id);
    });

    res.status(200).json({ status: 'success', message: 'Answer deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

const acceptAnswer = async (req, res, next) => {
  try {
    const answer = await prisma.answer.findUnique({
      where: { id: req.params.id },
      select: { id: true, authorId: true, questionId: true, isAccepted: true },
    });

    if (!answer) {
      return next(new AppError('Answer not found.', 404));
    }

    const question = await prisma.question.findUnique({
      where: { id: answer.questionId },
      select: { id: true, authorId: true, title: true },
    });

    if (!question) {
      return next(new AppError('Question not found.', 404));
    }

    if (question.authorId !== req.user.id) {
      return next(new AppError('Only the question owner can accept an answer.', 403));
    }

    if (answer.isAccepted) {
      return res.status(200).json({
        status: 'success',
        message: 'This answer is already accepted.',
      });
    }

    const updatedAnswer = await prisma.$transaction(async (transaction) => {
      // Only one accepted answer per question — unaccept any previous one.
      await transaction.answer.updateMany({
        where: { questionId: question.id, isAccepted: true },
        data: { isAccepted: false },
      });

      const accepted = await transaction.answer.update({
        where: { id: answer.id },
        data: { isAccepted: true },
        include: { author: { select: authorSelect } },
      });

      await adjustReputation(transaction, answer.authorId, REPUTATION_POINTS.ACCEPTED_ANSWER);

      return accepted;
    });

    const owner = await prisma.user.findUnique({
      where: { id: answer.authorId },
      select: { email: true, name: true },
    });
    if (owner) {
      sendNotificationEmail({
        to: owner.email,
        subject: 'Your answer was accepted!',
        text: `Your answer to "${question.title}" was marked as accepted.`,
        html: `<p>Your answer to "<strong>${question.title}</strong>" was marked as accepted.</p>`,
      });
    }

    res.status(200).json({ status: 'success', data: { answer: updatedAnswer } });
  } catch (error) {
    next(error);
  }
};

module.exports = { createAnswer, updateAnswer, deleteAnswer, acceptAnswer };
