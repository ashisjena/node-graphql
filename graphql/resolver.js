const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const Post = require('../models/post');

module.exports = {
	createUser(args, req) {
		const { email, password, name } = args.userInput;
		const errors = [];
		if (!validator.isEmail(email)) {
			errors.push({ message: 'Email is invalid!' });
		}
		if (validator.isEmpty(password) || !validator.isLength(password, { min: 5 })) {
			errors.push({ message: 'Password too short' });
		}
		if (errors.length > 0) {
			const error = new Error('Invalid Input');
			error.data = errors;
			error.code = 422;
			throw error;
		}
		return User.findByEmail(email)
			.then(user => {
				if (user) {
					const error = new Error('User exists already!');
					throw error;
				}
				return bcrypt.hash(password, 12);
			})
			.then(hashedPwd => {
				const user = new User(email, hashedPwd, name);
				return user.save().then(() => user);
			})
			.then(user => ({ ...user, id: user.id.toString() }))
			.catch(err => {
				console.error('The error is :', err);
				return err;
			});
	},
	login({ email, password }) {
		let user;
		return User.findByEmail(email)
			.then(userObj => {
				if (!userObj) {
					const error = new Error('User not found.');
					error.code = 401;
					throw error;
				}
				user = userObj;

				return bcrypt.compare(password, userObj.password);
			})
			.then(isEqual => {
				if (!isEqual) {
					const error = new Error('Password is incorrect.');
					throw error;
				}
				const token = jwt.sign(
					{
						userId: user.id,
						email: user.email
					},
					'somesupersuperscretkey',
					{
						expiresIn: `1h`
					}
				);
				return { token, userId: user.id.toString() };
			})
			.catch(err => {
				console.error('The error is :', err);
				return err;
			});
	},
	createPost({ postInput }, req) {
		if (!req.isAuth) {
			const error = new Error('Not authenticated');
			error.code = 401;
			throw error;
		}

		const { title, content, imageUrl } = postInput;
		const errors = [];
		if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
			error.push({ message: 'Title is invalid.' });
		}
		if (validator.isEmpty(content) || !validator.isLength(content, { min: 5 })) {
			error.push({ message: 'Content is invalid.' });
		}
		if (errors.length > 0) {
			const error = new Error('Invalid Input');
			error.data = errors;
			error.code = 422;
			throw error;
		}
		return User.findByEmail(req.email)
			.then(user => {
				if (!user) {
					const error = new Error('Invalid User.');
					error.code = 401;
					throw error;
				}
				const post = new Post(title, imageUrl, content, { email: user.email, name: user.name });
				console.log('post :', post);
				return post
					.save()
					.then(() => {
						user.posts.push(post);
						return user.update();
					})
					.then(() => {
						return post;
					});
			})
			.catch(err => {
				console.error('The error is :', err);
				return err;
			});
	},
	posts(args, req) {
		if (!req.isAuth) {
			const error = new Error('Not authenticated');
			error.code = 401;
			throw error;
		}

		return Post.fetchAll()
			.then(posts => {
				return {
					posts: posts.map(post => ({ ...post, createdAt: post.createdAt.toString(), updatedAt: post.updatedAt.toString() })),
					totalPosts: posts.length
				};
			})
			.catch(err => {
				console.error('The error is :', err);
				return err;
			});
	},
	post({ id }, req) {
		if (!req.isAuth) {
			const error = new Error('Not authenticated');
			error.code = 401;
			throw error;
		}

		return Post.findById(id)
			.then(post => {
				if (!post) {
					const error = new Error('No post found');
					error.code = 404;
					throw error;
				}
				return { ...post, createdAt: post.createdAt.toString() };
			})
			.catch(err => {
				console.error('The error is :', err);
				return err;
			});
	},
	updatePost({ id, postInput }, req) {
		if (!req.isAuth) {
			const error = new Error('Not authenticated');
			error.code = 401;
			throw error;
		}
		return Post.findById(id).then(post => {
			if (!post) {
				const error = new Error('No Post found');
				error.code = 400;
				throw error;
			}
			if (post.creator.email !== req.email) {
				console.log('post.creator.email :', post.creator.email);
				console.log('req.email :', req.email);
				const error = new Error('Not Authorized');
				error.code = 403;
				throw error;
			}
			const { title, content, imageUrl } = postInput;
			const errors = [];
			if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
				error.push({ message: 'Title is invalid.' });
			}
			if (validator.isEmpty(content) || !validator.isLength(content, { min: 5 })) {
				error.push({ message: 'Content is invalid.' });
			}
			if (errors.length > 0) {
				const error = new Error('Invalid Input');
				error.data = errors;
				error.code = 422;
				throw error;
			}

			post.title = postInput.title;
			post.content = postInput.content;
			if (postInput.imageUrl !== 'undefined') {
				post.imageUrl = postInput.imageUrl;
			}
			return post.update().then(() => post);
		});
	},
	deletePost({ id }, req) {
		if (!req.isAuth) {
			const error = new Error('Not authenticated');
			error.code = 401;
			throw error;
		}
		return Post.deleteById(id).then(post => {
			if (!post) {
				return false;
			}
			require('../utils/utils').clearImage(post.imageUrl);
			return User.findByEmail(post.creator.email).then(user => {
				user.removePost(post);
				return user.update().then(() => {
					return true;
				});
			});
		});
	},
	updateStatus({ status }, req) {
		if (!req.isAuth) {
			const error = new Error('Not authenticated');
			error.code = 401;
			throw error;
		}

		return User.findByEmail(req.email).then(user => {
			if (!user) {
				const error = new Error('User not found');
				error.code = 402;
				throw error;
			}
			user.status = status;
			return user.update().then(() => user);
		});
	},
	user(args, req) {
		return User.findByEmail(req.email);
	}
};
