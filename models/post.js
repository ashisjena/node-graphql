const uuid = require('uuid/v4');
const { ExecutionOptions } = require('cassandra-driver');

const modelName = require('../db/dbModalNames').POST;
const _db = require('../db/database');

module.exports = class Post {
	constructor(title, imageUrl, content, creator, createdAt = new Date().toISOString(), updatedAt = createdAt, id = uuid()) {
		this.title = title;
		this.imageUrl = imageUrl;
		this.content = content;
		this.creator = creator;
		this.createdAt = createdAt;
		this.updatedAt = updatedAt;
		this.id = id;
	}

	static build(post) {
		if (post) {
			return new Post(post.title, post.image_url, post.content, post.creator, post.created_at, post.updated_at, post.id);
		}
	}

	static getModel() {
		return _db.getDbModel(modelName);
	}

	save() {
		return Post.getModel()
			.insert(this)
			.catch(err => Promise.reject(err));
	}

	update() {
		return Post.getModel()
			.update(this)
			.catch(err => Promise.reject(err));
	}

	delete() {
		return Post.getModel()
			.remove(this)
			.catch(err => Promise.reject(err));
	}

	static fetchAll(itemsPerPage, pageState) {
		const executionOptions = new ExecutionOptions();
		executionOptions.fetchSize = itemsPerPage;
		executionOptions.pageState = pageState;

		return (
			Post.getModel()
				.findAll(null, executionOptions)
				.then(results => results.toArray())
				.catch(err => Promise.reject(err))
		);
	}

	static findById(id) {
		const query = 'SELECT * FROM post WHERE id = ?';
		return _db
			.getDbClient()
			.execute(query, [id], { prepare: true })
			.then(resSet => Post.build(resSet.first()))
			.catch(err => Promise.reject(err));
	}

	static deleteById(id) {
		return Post.findById(id).then(post => {
			if (!post) {
				return Promise.reject(`No post with id: ${id} found to delete.`);
			}
			return post.delete().then(res => post);
		});
	}

	static count() {
		const query = 'SELECT COUNT(*) FROM post';
		return _db
			.getDbClient()
			.execute(query)
			.then(resSet => +resSet.first().count)
			.catch(err => Promise.reject(err));
	}
};
