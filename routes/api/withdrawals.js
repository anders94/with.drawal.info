const homepageCache = require('../../cache');

module.exports = {
    get: async (req, res, next) => {
	try {
	    // Serve from cache instead of querying database
	    const withdrawalsData = homepageCache.getWithdrawalsData();
	    res.json(withdrawalsData);
	}
	catch (e) {
	    console.log(e);
	    res.render('error', {message: e});
	}
	finally {
	    return next;
	}
    }
};
