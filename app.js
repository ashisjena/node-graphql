const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const uuid = require('uuid/v4');
const graphqlHttp = require('express-graphql');

const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolver');
const _db = require('./db/database');
const auth = require('./middleware/is-auth');
const utils = require('./utils/utils');

const allowedOrigins = ['http://localhost:3000', 'https://s.codepen.io'];

const app = express();

const fileStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'images');
	},
	filename: (req, file, cb) => {
		cb(null, uuid() + '-' + file.originalname);
	}
});

const fileFilter = (req, file, cb) => {
	if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
		cb(null, true);
		return;
	}
	cb(null, false);
};

// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form></form>
app.use(bodyParser.json()); // application/json
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('image'));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
	if (allowedOrigins.includes(req.headers.origin)) {
		res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
	}
	res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

	if (req.method === 'OPTIONS') {
		return res.sendStatus(200);
	}
	next();
});

app.use(auth);

app.put('/post-image', (req, res, next) => {
  if(!req.isAuth) {
    throw new Error('Not authenticated!');
  }
  
	if (!req.file) {
		return res.status(200).json({ message: 'No file Provided!' });
	}

	if (req.body.oldPath) {
		utils.clearImage(req.body.oldPath);
	}

  return res
    .status(201)
    .json({ message: 'File Stored', filePath: req.file.path.replace('\\', '/') });
});

app.use(
	'/graphql',
	graphqlHttp({
		schema: graphqlSchema,
		rootValue: graphqlResolver,
		graphiql: true, // Special tool to test graphql (localhost:8080/graphql)
		formatError(err) {
			if (!err.originalError) {
				return err;
			}
			const data = err.originalError.data;
			const message = err.message || 'An error occurred';
			const code = err.originalError.code || 500;
			return { message: message, status: code, data: data };
		}
	})
);

app.use((error, req, res, next) => {
	console.error('The error is :', error);
	const statusCode = error.statusCode || 500;
	const { message, desc } = error;
	res.status(statusCode).json({ message, desc });
});

_db
	.cassandraConnect(() => {
		app.listen(8080);
	})
	.catch(err => console.log('err :', err));
