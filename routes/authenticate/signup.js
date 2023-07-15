const db = require('../../db');

module.exports = {
    post: async (req, res, next) => {
        const { fullName, signupEmail, signupPassword } = req.body;

	console.log('signup', fullName, signupEmail, 'xxx');

	res.render('error', {message: 'Sorry, signup isn\'t implemented yet. Please check back soon.'});
        //res.redirect('/');

    }

};
