const prisma = require('../config/prisma.js');
const AppError = require('../utils/AppError.js');

const createTag = async (req, res, next) => {
	try {
		const { name } = req.body;

		const existingTag = await prisma.tag.findUnique({
			where: { name },
		});

		if (existingTag) {
			return next(new AppError('A tag with this name already exists.', 409));
		}

		const tag = await prisma.tag.create({
			data: { name },
		});

		res.status(201).json({
			status: 'success',
			data: { tag },
		});
	} catch (error) {
		if (error.code === 'P2002') {
			return next(new AppError('A tag with this name already exists.', 409));
		}

		next(error);
	}
};

const getTags = async (req, res, next) => {
	try {
		const tags = await prisma.tag.findMany({
			orderBy: { name: 'asc' },
			include: {
				_count: {
					select: { posts: true },
				},
			},
		});

		res.status(200).json({
			status: 'success',
			data: { tags },
		});
	} catch (error) {
		next(error);
	}
};

module.exports = { createTag, getTags };
