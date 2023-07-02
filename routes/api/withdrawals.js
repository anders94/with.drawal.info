const db = require('../../db');

module.exports = {
    get: async (req, res, next) => {
	try {
	    const w = await db.query(
		`SELECT
                   s.stamp, w.slot_id,
                   SUM((SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, s.stamp))) LIMIT 1) * (w.amount / 1000000000.0)) AS usd_total
                 FROM
                   withdrawals w
                     LEFT JOIN slots s ON w.slot_id = s.id
                 GROUP BY s.stamp, w.slot_id
                 ORDER BY slot_id DESC
                 LIMIT 50`);

	    res.json(w.rows);

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
