const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
	const authHeader = req.get('Authorization');
	if (!authHeader) {
		req.isAuth = false;
		return next();
	}
	
	let decodedToken;
	try {
		const token = authHeader.split(' ')[1];
		decodedToken = jwt.verify(token, 'somesupersuperscretkey');
	} catch (err) {
		req.isAuth = false;
		console.error('The error is :', err);
		return next();
	}

	if (!decodedToken) {
		req.isAuth = false;
		return next();
	}

	req.isAuth = true;
	req.userId = decodedToken.userId;
	req.email = decodedToken.email;
	next();
};
