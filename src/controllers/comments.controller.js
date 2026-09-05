/**
 * OWNER: Student B
 * Controller for /api/v1/comments
 */
const prisma = require('../config/prisma.js');
const AppError = require('../utils/AppError.js');

const authorSelect = {
  id: true,
  name: true,
  profileImageUrl: true,
  reputation: true,
};

const commentOnQuestion = async (req, res, next) => {
  try {
    const question = await prisma.question.findFirst({
      where: { id: req.params.id, isDeleted: false },
      select: { id: true },
    });

    if (!question) {
      return next(new AppError('Question not found.', 404));
    }

    const comment = await prisma.comment.create({
      data: {
        content: req.body.content,
        authorId: req.user.id,
        questionId: question.id,
      },
      include: { author: { select: authorSelect } },
    });

    res.status(201).json({ status: 'success', data: { comment } });
  } catch (error) {
    next(error);
  }
};

const commentOnAnswer = async (req, res, next) => {
  try {
    const answer = await prisma.answer.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });

    if (!answer) {
      return next(new AppError('Answer not found.', 404));
    }

    const comment = await prisma.comment.create({
      data: {
        content: req.body.content,
        authorId: req.user.id,
        answerId: answer.id,
      },
      include: { author: { select: authorSelect } },
    });

    res.status(201).json({ status: 'success', data: { comment } });
  } catch (error) {
    next(error);
  }
};

module.exports = { commentOnQuestion, commentOnAnswer };
