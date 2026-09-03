const multer = require('multer');
const AppError = require('../utils/AppError.js');

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(
        new AppError('Only JPEG, PNG, and WebP images are allowed.', 400)
      );
      return;
    }

    callback(null, true);
  },
});

const uploadAvatar = (req, res, next) => {
  upload.single('avatar')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      next(new AppError('Avatar image must not exceed 2MB.', 413));
      return;
    }

    next(error);
  });
};

module.exports = { upload, uploadAvatar };