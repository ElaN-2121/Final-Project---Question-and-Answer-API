const prisma = require('../config/prisma.js');
const cloudinary = require('../config/cloudinary.js');
const AppError = require('../utils/AppError.js');

const publicUserSelect = {
	id: true,
	name: true,
	email: true,
	bio: true,
	profileImageUrl: true,
	role: true,
	reputation: true,
	isVerified: true,
	createdAt: true,
	_count: {
		select: {
			questions: true,
			answers: true,
		},
	},
};

const getUserById = async (req, res, next) => {
	try {
		const user = await prisma.user.findUnique({
			where: { id: req.params.id },
			select: publicUserSelect,
		});

		if (!user) {
			return next(new AppError('User not found.', 404));
		}

		const acceptedAnswersCount = await prisma.answer.count({
			where: {
				authorId: req.params.id,
				isAccepted: true,
			},
		});

		res.status(200).json({
			status: 'success',
			data: {
				user: {
					...user,
					stats: {
						questionsAsked: user._count.questions,
						answersSubmitted: user._count.answers,
						acceptedAnswers: acceptedAnswersCount,
					},
				},
			},
		});
	} catch (error) {
		next(error);
	}
};

const updateMe = async (req, res, next) => {
	try {
		const updatedUser = await prisma.user.update({
			where: { id: req.user.id },
			data: {
				...(req.body.name !== undefined ? { name: req.body.name } : {}),
				...(req.body.bio !== undefined ? { bio: req.body.bio } : {}),
			},
			select: publicUserSelect,
		});

		res.status(200).json({
			status: 'success',
			data: { user: updatedUser },
		});
	} catch (error) {
		next(error);
	}
};

const uploadAvatar = async (req, res, next) => {
	try {
		if (!req.file) {
			return next(new AppError('Please attach an avatar image.', 400));
		}

		const profileImageUrl = await cloudinary.uploadToCloudinary(
			req.file.buffer,
			'knowledgehub/avatars'
		);

		const updatedUser = await prisma.user.update({
			where: { id: req.user.id },
			data: { profileImageUrl },
			select: publicUserSelect,
		});

		res.status(200).json({
			status: 'success',
			data: {
				user: updatedUser,
				profileImageUrl,
			},
		});
	} catch (error) {
		next(error);
	}
};

module.exports = { getUserById, updateMe, uploadAvatar };
