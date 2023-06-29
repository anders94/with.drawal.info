const db = require('../../db');

module.exports = {
    post: async (req, res, next) => {
	const { query } = req.body;

	if (new RegExp('^0x[0-9a-fA-F]{40}').test(query)) {
	    res.redirect('/address/' + query);
	    return next;
	}

	if (new RegExp('^[0-9]+$').test(query)) {
	    res.redirect('/validator/' + query);
	    return next;
	}

	res.render('error', {message: 'We\'ll need a validator number or withdrawal address to continue!'});
	return next;

    }

};
