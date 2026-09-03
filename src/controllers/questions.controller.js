const prisma = require('../config/prisma.js');
const AppError = require('../utils/AppError.js');

const authorSelect = {
  id: true,
  name: true,
  profileImageUrl: true,
  reputation: true,
};

const questionWithRelations = {
  author: { select: authorSelect },
  tags: {
    include: {
      tag: { select: { id: true, name: true } },
    },
  },
};

const createTagLinks = async (transaction, questionId, tagNames) => {
  const tags = await Promise.all(
    tagNames.map((name) =>
      transaction.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );

  await transaction.questionTag.createMany({
    data: tags.map((tag) => ({ questionId, tagId: tag.id })),
  });
};

const createQuestion = async (req, res, next) => {
  try {
    const { title, description, tags } = req.body;

    const question = await prisma.$transaction(async (transaction) => {
      const createdQuestion = await transaction.question.create({
        data: { title, description, authorId: req.user.id },
      });

      await createTagLinks(transaction, createdQuestion.id, tags);

      await transaction.user.update({
        where: { id: req.user.id },
        data: { reputation: { increment: 5 } },
      });

      return transaction.question.findUnique({
        where: { id: createdQuestion.id },
        include: questionWithRelations,
      });
    });

    res.status(201).json({ status: 'success', data: { question } });
  } catch (error) {
    next(error);
  }
};

const getQuestions = async (req, res, next) => {
  try {
    const questions = await prisma.question.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        authorId: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
        author: { select: authorSelect },
        tags: { include: { tag: { select: { id: true, name: true } } } },
        _count: { select: { answers: true, votes: true, comments: true } },
      },
    });

    res.status(200).json({ status: 'success', data: { questions } });
  } catch (error) {
    next(error);
  }
};

const getQuestionById = async (req, res, next) => {
  try {
    const question = await prisma.question.findFirst({
      where: { id: req.params.id, isDeleted: false },
      include: {
        ...questionWithRelations,
        answers: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: authorSelect },
            _count: { select: { votes: true, comments: true } },
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: authorSelect } },
        },
        votes: { select: { type: true } },
        _count: { select: { answers: true, votes: true, comments: true } },
      },
    });

    if (!question) {
      return next(new AppError('Question not found.', 404));
    }

    const voteTotals = question.votes.reduce(
      (totals, vote) => {
        if (vote.type === 'UPVOTE') totals.upvotes += 1;
        if (vote.type === 'DOWNVOTE') totals.downvotes += 1;
        return totals;
      },
      { upvotes: 0, downvotes: 0 }
    );

    const { votes, ...questionWithoutVotes } = question;
    res.status(200).json({
      status: 'success',
      data: { question: { ...questionWithoutVotes, voteTotals } },
    });
  } catch (error) {
    next(error);
  }
};

const updateQuestion = async (req, res, next) => {
  try {
    const question = await prisma.question.findFirst({
      where: { id: req.params.id, isDeleted: false },
      select: { id: true, authorId: true },
    });

    if (!question) {
      return next(new AppError('Question not found.', 404));
    }

    if (question.authorId !== req.user.id) {
      return next(new AppError('You can only update your own questions.', 403));
    }

    const updatedQuestion = await prisma.$transaction(async (transaction) => {
      const data = {};
      if (req.body.title !== undefined) data.title = req.body.title;
      if (req.body.description !== undefined) {
        data.description = req.body.description;
      }

      await transaction.question.update({
        where: { id: question.id },
        data,
      });

      if (req.body.tags !== undefined) {
        await transaction.questionTag.deleteMany({
          where: { questionId: question.id },
        });
        await createTagLinks(transaction, question.id, req.body.tags);
      }

      return transaction.question.findUnique({
        where: { id: question.id },
        include: questionWithRelations,
      });
    });

    res.status(200).json({
      status: 'success',
      data: { question: updatedQuestion },
    });
  } catch (error) {
    next(error);
  }
};

const deleteQuestion = async (req, res, next) => {
  try {
    const question = await prisma.question.findUnique({
      where: { id: req.params.id },
      select: { id: true, authorId: true, isDeleted: true },
    });

    if (!question) {
      return next(new AppError('Question not found.', 404));
    }

    const canDelete =
      question.authorId === req.user.id ||
      ['ADMIN', 'MODERATOR'].includes(req.user.role);

    if (!canDelete) {
      return next(new AppError('You do not have permission to delete this question.', 403));
    }

    await prisma.question.update({
      where: { id: question.id },
      data: { isDeleted: true },
    });

    res.status(200).json({
      status: 'success',
      message: 'Question deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
};
