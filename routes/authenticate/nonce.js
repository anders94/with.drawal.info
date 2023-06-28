const { generateNonce } = require('siwe');

module.exports = {
    get: async (req, res, next) => {
	res.setHeader('Content-Type', 'text/plain');
	res.send(generateNonce());

	return next;

    }

};
