const uuid = require('uuid/v4');
const { ExecutionOptions } = require('cassandra-driver');

const modelName = require('../db/dbModalNames').USER;
const _db = require('../db/database');

module.exports = class User {
	constructor(email, password, name, status = 'update me!', posts = [], id = uuid()) {
		this.email = email;
		this.password = password;
		this.name = name;
		this.status = status;
		this.posts = posts;
		this.id = id;
	}

	static build(user) {
		if (user) {
			return new User(user.email, user.password, user.name, user.status, user.posts || [], user.id);
		}
	}

	static getModel() {
		return _db.getDbModel(modelName);
	}

	addPost(post) {
		if (post) {
			// this.posts.push(post)
			this.posts.push({
				id: post.id,
				title: post.title,
				image_url: post.imageUrl,
				content: post.content,
				creator: post.creator,
				created_at: post.createdAt,
				updated_at: post.updatedAt
			});
		}
	}

	removePost(post) {
		if (post) {
			this.posts = this.posts.filter(item => item.id.toString() !== post.id.toString());
		}
	}

	save() {
		return User.getModel()
			.insert(this)
			.catch(err => Promise.reject(err));
	}

	update() {
		return User.getModel()
			.update(this)
			.catch(err => Promise.reject(err));
	}

	delete() {
		return User.getModel()
			.remove(this)
			.catch(err => Promise.reject(err));
	}

	static fetchAll(itemsPerPage, pageState) {
		const executionOptions = new ExecutionOptions();
		executionOptions.fetchSize = itemsPerPage;
		executionOptions.pageState = pageState;

		return (
			User.getModel()
				.findAll(null, executionOptions)
				// .then(results => results.toArray())
				.catch(err => Promise.reject(err))
		);
	}

	static findByEmail(email) {
		return email
			? User.getModel()
					.get({ email })
					.then(user => User.build(user))
					.catch(err => Promise.reject(err))
			: Promise.resolve(null);
	}

	static findById(id) {
		const query = 'SELECT * FROM user WHERE id = ?';
		return _db
			.getDbClient()
			.execute(query, [id], { prepare: true })
			.then(resSet => User.build(resSet.first()))
			.catch(err => Promise.reject(err));
	}
};
