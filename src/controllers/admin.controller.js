/**
 * OWNER: Student B
 * Controller for /api/v1/admin
 * All routes here are gated by restrictTo('ADMIN') in admin.routes.js
 */
const prisma = require('../config/prisma.js');
const AppError = require('../utils/AppError.js');
const { hardDeleteAnswer } = require('../utils/cascadeDelete.js');

const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  reputation: true,
  isBlocked: true,
  isSuspended: true,
  suspendedUntil: true,
  isVerified: true,
  createdAt: true,
};

const getAllUsers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: adminUserSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count(),
    ]);

    res.status(200).json({
      status: 'success',
      data: { users },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        _count: { select: { questions: true, answers: true, comments: true, votes: true } },
      },
    });

    if (!user) {
      return next(new AppError('User not found.', 404));
    }

    // The schema has no onDelete: Cascade from Question/Answer/Comment/Vote
    // back to User, so deleting a user with any existing content would
    // fail on a foreign key constraint. Surface a clear message instead
    // of letting that hit the generic Prisma error handler.
    const hasContent =
      user._count.questions > 0 ||
      user._count.answers > 0 ||
      user._count.comments > 0 ||
      user._count.votes > 0;

    if (hasContent) {
      return next(
        new AppError(
          'This user has existing questions, answers, comments, or votes and cannot be deleted. Block the account instead.',
          409
        )
      );
    }

    await prisma.$transaction([
      prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
      prisma.user.delete({ where: { id: user.id } }),
    ]);

    res.status(200).json({ status: 'success', message: 'User deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

const blockUser = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, role: true },
    });

    if (!user) {
      return next(new AppError('User not found.', 404));
    }

    if (user.role === 'ADMIN') {
      return next(new AppError('Admin accounts cannot be blocked.', 403));
    }

    const updatedUser = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.user.update({
        where: { id: user.id },
        data: { isBlocked: true },
        select: adminUserSelect,
      });
      // Revoke active sessions immediately so a blocked user can't
      // keep refreshing their access token.
      await transaction.refreshToken.deleteMany({ where: { userId: user.id } });
      return updated;
    });

    res.status(200).json({ status: 'success', data: { user: updatedUser } });
  } catch (error) {
    next(error);
  }
};

const unblockUser = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });

    if (!user) {
      return next(new AppError('User not found.', 404));
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isBlocked: false },
      select: adminUserSelect,
    });

    res.status(200).json({ status: 'success', data: { user: updatedUser } });
  } catch (error) {
    next(error);
  }
};

const deleteQuestionAdmin = async (req, res, next) => {
  try {
    const question = await prisma.question.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });

    if (!question) {
      return next(new AppError('Question not found.', 404));
    }

    await prisma.question.update({
      where: { id: question.id },
      data: { isDeleted: true },
    });

    res.status(200).json({ status: 'success', message: 'Question removed by admin.' });
  } catch (error) {
    next(error);
  }
};

const deleteAnswerAdmin = async (req, res, next) => {
  try {
    const answer = await prisma.answer.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });

    if (!answer) {
      return next(new AppError('Answer not found.', 404));
    }

    await prisma.$transaction(async (transaction) => {
      await hardDeleteAnswer(transaction, answer.id);
    });

    res.status(200).json({ status: 'success', message: 'Answer removed by admin.' });
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      blockedUsers,
      suspendedUsers,
      totalQuestions,
      totalAnswers,
      totalComments,
      totalVotes,
      totalTags,
      pendingReports,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isBlocked: true } }),
      prisma.user.count({ where: { isSuspended: true } }),
      prisma.question.count({ where: { isDeleted: false } }),
      prisma.answer.count(),
      prisma.comment.count(),
      prisma.vote.count(),
      prisma.tag.count(),
      prisma.report.count({ where: { status: 'PENDING' } }),
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        totalUsers,
        blockedUsers,
        suspendedUsers,
        totalQuestions,
        totalAnswers,
        totalComments,
        totalVotes,
        totalTags,
        pendingReports,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  deleteUser,
  blockUser,
  unblockUser,
  deleteQuestionAdmin,
  deleteAnswerAdmin,
  getStats,
};
