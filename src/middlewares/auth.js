const prisma = require('../config/prisma.js');
const { verifyAccessToken } = require('../utils/token.js');
const AppError = require('../utils/AppError.js');

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   responses:
 *     UnauthorizedError:
 *       description: Access token is missing or invalid
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: fail
 *               message:
 *                 type: string
 *                 example: You are not logged in. Please log in to get access.
 *     ForbiddenError:
 *       description: Insufficient permissions
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: fail
 *               message:
 *                 type: string
 *                 example: You do not have permission to perform this action.
 */

/**
 * Protect middleware: Verifies JWT and attaches current user to req.user
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Extract Bearer token from authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(
        new AppError('You are not logged in. Please log in to get access.', 401)
      );
    }

    // 2. Verify token signature and expiration
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Token has expired. Please log in again.', 401));
      }
      return next(new AppError('Invalid token. Please log in again.', 401));
    }

    // 3. Verify user still exists in database
    const currentUser = await prisma.user.findUnique({
  where: { id: decoded.id },
  select: {
    id: true,
    name: true,
    email: true,
    role: true,
    isBlocked: true,
    isSuspended: true,
    suspendedUntil: true,
    reputation: true,
    profileImageUrl: true,
    createdAt: true,
      },
    });

    if (!currentUser) {
      return next(
        new AppError('The user belonging to this token no longer exists.', 401)
      );
    }

    // 4. Check if user is blocked
    if (currentUser.isBlocked) {
      return next(
        new AppError('Your account has been suspended. Please contact support.', 403)
      );
    }

    if (currentUser.isSuspended) {
  if (currentUser.suspendedUntil && new Date() < currentUser.suspendedUntil) {
    return next(
      new AppError(`Your account is suspended until ${currentUser.suspendedUntil.toISOString()}.`, 403)
    );
  }
}

    // 5. Grant access: attach user to request object
    req.user = currentUser;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * RBAC middleware: Restricts route access to specified roles
 * @param  {...string} roles - Allowed roles (e.g. 'ADMIN', 'MODERATOR')
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403)
      );
    }
    next();
  };
};

module.exports = { protect, restrictTo };

