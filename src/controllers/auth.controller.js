const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/prisma.js');
const transporter = require('../config/mail.js');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/token.js');
const AppError = require('../utils/AppError.js');

/**
 * Helper to generate tokens and store refresh token in database
 */
const createAndSendTokens = async (user, statusCode, res) => {
  const accessToken = generateAccessToken({ id: user.id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user.id });

  // Calculate refresh token expiry date (7 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Store refresh token in PostgreSQL via Prisma
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  // Remove password from output
  const { password: _, ...sanitizedUser } = user;

  res.status(statusCode).json({
    status: 'success',
    data: {
      user: sanitizedUser,
      accessToken,
      refreshToken,
    },
  });
};

/**
 * Register a new user
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // 1. Check if email already registered
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return next(new AppError('An account with this email already exists.', 409));
    }

    // 2. Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Create user in database (starts with reputation 0)
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        reputation: 0,
      },
    });

    // 4. Issue tokens and return response
    await createAndSendTokens(newUser, 201, res);
  } catch (error) {
    next(error);
  }
};

/**
 * User login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return next(new AppError('Invalid email or password.', 401));
    }

    // 2. Check if user is blocked
    if (user.isBlocked) {
      return next(
        new AppError('Your account has been suspended. Please contact support.', 403)
      );
    }

    // 3. Compare password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return next(new AppError('Invalid email or password.', 401));
    }

    // 4. Issue tokens
    await createAndSendTokens(user, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token using refresh token rotation
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: incomingToken } = req.body;

    // 1. Verify token signature
    let decoded;
    try {
      decoded = verifyRefreshToken(incomingToken);
    } catch (err) {
      return next(new AppError('Invalid or expired refresh token.', 401));
    }

    // 2. Find token record in database
    const savedToken = await prisma.refreshToken.findUnique({
      where: { token: incomingToken },
      include: { user: true },
    });

    if (!savedToken) {
      return next(new AppError('Refresh token revoked or invalid.', 401));
    }

    // 3. Check if user is blocked or deleted
    if (!savedToken.user || savedToken.user.isBlocked) {
      // Invalidate token
      await prisma.refreshToken.delete({ where: { token: incomingToken } });
      return next(new AppError('User account is invalid or suspended.', 403));
    }

    // 4. Token rotation: Delete the used refresh token
    await prisma.refreshToken.delete({
      where: { token: incomingToken },
    });

    // 5. Generate and persist new token pair
    await createAndSendTokens(savedToken.user, 200, res);
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user (revoke active refresh token)
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken: incomingToken } = req.body;

    if (incomingToken) {
      // Invalidate refresh token from database if present
      await prisma.refreshToken.deleteMany({
        where: { token: incomingToken },
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request a password reset email without revealing whether the email exists.
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      const passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken, passwordResetExpires },
      });

      const resetUrl = `${process.env.PASSWORD_RESET_URL || 'http://localhost:3000/reset-password'}/${resetToken}`;

      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: user.email,
          subject: 'KnowledgeHub password reset',
          text: `Reset your KnowledgeHub password using this link: ${resetUrl}. This link expires in 15 minutes.`,
          html: `<p>Reset your KnowledgeHub password using this link:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 15 minutes.</p>`,
        });
      } catch (mailError) {
        console.error('Password reset email delivery failed:', mailError.message);
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset a password using a single-use, time-limited token.
 */
const resetPassword = async (req, res, next) => {
  try {
    const passwordResetToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return next(new AppError('Reset token is invalid or has expired.', 400));
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 12);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    await createAndSendTokens(updatedUser, 200, res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
};

