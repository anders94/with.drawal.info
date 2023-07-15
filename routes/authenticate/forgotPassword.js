const db = require('../../db');

module.exports = {
    post: async (req, res, next) => {
        const { forgotEmail } = req.body;

	console.log('forgot password', forgotEmail);

        res.redirect('/');

    }

};
