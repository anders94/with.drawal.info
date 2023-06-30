const db = require('../../db');
const bcrypt = require('bcrypt');

module.exports = {
    get: async (req, res, next) => {
	req.session.user = null;
	res.redirect('/');

    }

};
