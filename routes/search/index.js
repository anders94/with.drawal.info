const db = require('../../db');

module.exports = {
    post: async (req, res, next) => {
	const { query } = req.body;

	if (query && !isNaN(query) && !isNaN(parseInt(query)))
	    res.redirect('/validator/' + query);
	else
	    res.render('error', {message: 'not a valid number!'});

	return next;

    }

};
