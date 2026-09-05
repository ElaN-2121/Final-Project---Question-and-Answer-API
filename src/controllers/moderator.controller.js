/**
 * OWNER: Student B
 * Controller for /api/v1/moderator
 *
 * createReport is exposed here (any authenticated user, not just
 * moderators — restrictTo is applied per-route in moderator.routes.js,
 * not globally) because it's the only way Report rows get created at
 * all. It could instead live as POST /questions/:id/report and
 * POST /answers/:id/report per the original route sketch, but those
 * paths belong to Student A's questions.routes.js / answers.routes.js
 * — keeping it here avoids editing files outside this scope. Worth
 * adding thin alias routes there later if you'd rather have it nested.
 */
const prisma = require('../config/prisma.js');
const AppError = require('../utils/AppError.js');
const { hardDeleteAnswer } = require('../utils/cascadeDelete.js');

const reportSelect = {
  id: true,
  reason: true,
  status: true,
  createdAt: true,
  reporter: { select: { id: true, name: true, email: true } },
  question: { select: { id: true, title: true, isDeleted: true } },
  answer: { select: { id: true, content: true, questionId: true } },
};

const createReport = async (req, res, next) => {
  try {
    const { questionId, answerId, reason } = req.body;

    if (questionId) {
      const question = await prisma.question.findFirst({
        where: { id: questionId, isDeleted: false },
        select: { id: true },
      });
      if (!question) return next(new AppError('Question not found.', 404));
    }

    if (answerId) {
      const answer = await prisma.answer.findUnique({
        where: { id: answerId },
        select: { id: true },
      });
      if (!answer) return next(new AppError('Answer not found.', 404));
    }

    const report = await prisma.report.create({
      data: {
        reporterId: req.user.id,
        questionId: questionId || null,
        answerId: answerId || null,
        reason,
      },
      select: reportSelect,
    });

    res.status(201).json({ status: 'success', data: { report } });
  } catch (error) {
    next(error);
  }
};

const getReports = async (req, res, next) => {
  try {
    const status = ['PENDING', 'REVIEWED', 'REMOVED'].includes(req.query.status)
      ? req.query.status
      : 'PENDING';

    const reports = await prisma.report.findMany({
      where: { status },
      orderBy: { createdAt: 'asc' }, // oldest first — FIFO queue
      select: reportSelect,
    });

    res.status(200).json({ status: 'success', data: { reports } });
  } catch (error) {
    next(error);
  }
};

const reviewReport = async (req, res, next) => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });

    if (!report) {
      return next(new AppError('Report not found.', 404));
    }

    const updatedReport = await prisma.report.update({
      where: { id: report.id },
      data: { status: req.body.status, reviewedById: req.user.id },
      select: reportSelect,
    });

    res.status(200).json({ status: 'success', data: { report: updatedReport } });
  } catch (error) {
    next(error);
  }
};

const removeContent = async (req, res, next) => {
  try {
    const { type, id } = req.params;

    if (type === 'question') {
      const question = await prisma.question.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!question) return next(new AppError('Question not found.', 404));

      await prisma.$transaction(async (transaction) => {
        await transaction.question.update({ where: { id }, data: { isDeleted: true } });
        await transaction.report.updateMany({
          where: { questionId: id, status: 'PENDING' },
          data: { status: 'REMOVED', reviewedById: req.user.id },
        });
      });
    } else {
      const answer = await prisma.answer.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!answer) return next(new AppError('Answer not found.', 404));

      await prisma.$transaction(async (transaction) => {
        // Resolve pending reports before the delete removes the row
        // they reference.
        await transaction.report.updateMany({
          where: { answerId: id, status: 'PENDING' },
          data: { status: 'REMOVED', reviewedById: req.user.id },
        });
        await hardDeleteAnswer(transaction, id);
      });
    }

    res.status(200).json({
      status: 'success',
      message: `${type === 'question' ? 'Question' : 'Answer'} removed and related reports resolved.`,
    });
  } catch (error) {
    next(error);
  }
};

const suspendUser = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, role: true },
    });

    if (!user) {
      return next(new AppError('User not found.', 404));
    }

    if (user.role === 'ADMIN' || user.role === 'MODERATOR') {
      return next(new AppError('Admin and moderator accounts cannot be suspended.', 403));
    }

    const suspendedUntil = new Date(Date.now() + req.body.hours * 60 * 60 * 1000);

    const updatedUser = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.user.update({
        where: { id: user.id },
        data: { isSuspended: true, suspendedUntil },
        select: { id: true, name: true, isSuspended: true, suspendedUntil: true },
      });
      // Revoke active sessions so a suspended user can't refresh past it.
      await transaction.refreshToken.deleteMany({ where: { userId: user.id } });
      return updated;
    });

    res.status(200).json({ status: 'success', data: { user: updatedUser } });
  } catch (error) {
    next(error);
  }
};

module.exports = { createReport, getReports, reviewReport, removeContent, suspendUser };
