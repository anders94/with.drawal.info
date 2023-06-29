const db = require('../../db');

module.exports = {
    post: async (req, res, next) => {
        const { fullName, signupEmail, signupPassword } = req.body;

	console.log(fullName, signupEmail, signupPassword);

        res.redirect('/');

    }

};
