const { validationResult } = require('express-validator/check');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const utils = require('../utils/utils');

exports.signup = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		throw utils.createError(422, 'Validation failed, entered data is incorrect', errors.array());
	}

	const email = req.body.email;
	const name = req.body.name;
	const password = req.body.password;
	bcrypt
		.hash(password, 12)
		.then(hashedPwd => {
			const user = new User(email, hashedPwd, name);
			user.save().then(result => {
				res.status(201).json({ message: 'User created!', userId: user.id });
			});
		})
		.catch(error => {
			if (error.statusCode) {
				return next(error);
			}
			next(utils.createError(500, 'Error while signup', error));
		});
};

exports.login = (req, res, next) => {
	const { email, password } = req.body;
	let loadedUser;
	User.findByEmail(email)
		.then(user => {
			if (!user) {
				throw utils.createError(401, `User with email: ${email} couldn't be found`);
			}
			loadedUser = user;
			return bcrypt.compare(password, user.password);
		})
		.then(isEqual => {
			if (!isEqual) {
				throw utils.createError(401, 'Wrong Password');
			}
			const expiry = new Date();
			expiry.setTime(expiry.getTime() + 1 * 60 * 60 * 1000);
			const token = jwt.sign(
				{
					email: loadedUser.email,
					userId: loadedUser.id.toString()
				},
				utils.secretKey,
				{ expiresIn: '1h' }
			);
			res.status(200).json({ token, userId: loadedUser.id.toString(), expiry });
		})
		.catch(error => {
			if (error.statusCode) {
				return next(error);
			}
			next(utils.createError(500, 'Error while signin', error));
		});
};

exports.getUserStatus = (req, res, next) => {
	User.findByEmail(req.email)
		.then(user => {
			if (!user) {
				throw utils.createError(404, 'User not found');
			}
			res.status(200).json({ status: user.status });
		})
		.catch(error => {
			if (error.statusCode) {
				return next(error);
			}
			next(utils.createError(500, 'Error while fetching status', error));
		});
};

exports.updateUserStatus = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		throw utils.createError(422, 'Validation failed, entered data is incorrect', errors.array());
	}

	User.findByEmail(req.email)
		.then(user => {
			if (!user) {
				throw utils.createError(404, 'User not found');
			}
			return user;
		})
		.then(user => {
			user.status = req.body.status;
			return user.update();
		})
		.then(() => {
			res.status(200).json({ message: 'User status updated' });
		})
		.catch(error => {
			if (error.statusCode) {
				return next(error);
			}
			next(utils.createError(500, 'Error while updating status', error));
		});
};
