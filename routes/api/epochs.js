const homepageCache = require('../../cache');

module.exports = {
    get: async (req, res, next) => {
	try {
	    // Serve from cache instead of querying database
	    const epochsData = homepageCache.getEpochsData();
	    res.json(epochsData);
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
