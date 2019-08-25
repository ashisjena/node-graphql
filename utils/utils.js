const fs = require('fs');
const path = require('path');

exports.createError = (statusCode, message, desc = message) => {
	const error = new Error(message);
	error.statusCode = statusCode;
	error.message = message;
	error.desc = desc;
	return error;
};

exports.clearImage = filePath => {
	fs.unlink(path.join('.', filePath), err => {
		if (err) console.error(err);
	});
};

exports.secretKey = 'This is some highly secret key';
