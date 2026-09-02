/**
 * Wrap async route handlers so rejected promises are forwarded to
 * the centralized error handler instead of needing try/catch in
 * every single controller.
 *
 * Usage:
 *   router.get('/questions/:id', catchAsync(async (req, res) => {
 *     const question = await prisma.question.findUnique(...);
 *     res.json(question);
 *   }));
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = catchAsync;