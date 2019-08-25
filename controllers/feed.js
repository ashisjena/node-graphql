const { validationResult } = require('express-validator/check');

const io = require('../socket');
const Post = require('../models/post');
const User = require('../models/user');
const utils = require('../utils/utils');

exports.getPosts = (req, res, next) => {
	Post.fetchAll()
		.then(posts => {
			return res.status(200).json({ posts: posts.toArray() });
		})
		.catch(err => {
			next(utils.createError(502, 'Posts fetch failed', err.toString()));
		});
};

exports.createPost = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		throw utils.createError(422, 'Validation failed, entered data is incorrect', errors.array());
	}
	if (!req.file) {
		throw utils.createError(422, 'No image provided', 'No Image uploaded');
	}

	const imageUrl = req.file.path.replace('\\', '/');
	const { title, content } = req.body;
	User.findById(req.userId)
		.then(user => {
			if (!user) {
				throw utils.createError(500, 'User not found');
			}
			const { name, email } = user;
			const post = new Post(title, imageUrl, content, { name, email });
			post
				.save()
				.then(() => {
					user.addPost(post);
					return user.update();
				})
				.then(() => {
					io.getIO().emit('posts', { action: 'create', post: post });
					res.status(201).json({
						message: 'Post created successfully!',
						post: post,
						creator: { id: user.id, name: user.name }
					});
				});
		})
		.catch(err => {
			if (!err.statusCode) {
				return next(err);
			}
			next(utils.createError(502, 'Error while creating Post', err.toString()));
		});
};

exports.getPost = (req, res, next) => {
	const postId = req.params.postId;
	Post.findById(postId)
		.then(post => {
			if (!post) {
				throw utils.createError(502, 'Not Found', "Requested post couldn't be retrieved");
			}
			res.status(200).json({ message: 'Post fetched', post: post });
		})
		.catch(error => {
			if (error.statusCode) {
				return next(error);
			}
			next(utils.createError(502, 'Error while getting post details', error.toString()));
		});
};

exports.updatePost = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		throw utils.createError(422, 'Validation failed, entered data is incorrect', errors.array());
	}

	const postId = req.params.postId;
	const title = req.body.title;
	const content = req.body.content;
	let imageUrl, prevImageUrl;
	if (req.file) {
		imageUrl = req.file.path.replace('\\', '/');
	}

	Post.findById(postId)
		.then(post => {
			if (post.creator.email !== req.email) {
				throw utils.createError(403, 'Not authorized');
			}

			post.title = title;
			post.content = content;
			post.updatedAt = new Date().toISOString();
			if (imageUrl) {
				prevImageUrl = post.imageUrl;
				post.imageUrl = imageUrl;
			}
			return post.update().then(res => ({
				post,
				imageUrl,
				prevImageUrl
			}));
		})
		.then(data => {
			io.getIO().emit('posts', { action: 'update', post: data.post });
			res.status(200).json({ message: 'Post updated successfully', post: data.post });
			if (data.imageUrl) {
				utils.clearImage(data.prevImageUrl);
			}
		})
		.catch(error => {
			if (error.statusCode) {
				return next(error);
			}
			next(utils.createError(502, 'Error while updating the post', error.toString()));
		});
};

exports.deletePost = (req, res, next) => {
	const postId = req.params.postId;
	Post.findById(postId)
		.then(post => {
			if (post.creator.email !== req.email) {
				throw utils.createError(403, 'Not authorized');
			}
			return Post.deleteById(postId);
		})
		.then(post => {
			User.findByEmail(req.email)
				.then(user => {
					user.removePost(post);
					return user.update();
				})
				.then(() => {
					utils.clearImage(post.imageUrl);
					io.getIO().emit('posts', { action: 'delete', post: post });
					res.status(200).json({ message: 'Deleted post.' });
				});
		})
		.catch(error => {
			if (error.statusCode) {
				return next(error);
			}
			next(utils.createError(502, 'Error while updating the post', error));
		});
};
