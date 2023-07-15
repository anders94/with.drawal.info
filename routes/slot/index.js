const db = require('../../db');
const id = require('./id');

module.exports = {
    id: id,
    get: async (req, res, next) => {
	try {
	    const s = await db.query(
		`SELECT
                   w.slot_id, s.stamp, SUM(w.amount) / 1000000000.0 AS eth_value,
                   (SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, s.stamp))) LIMIT 1) * (SUM(w.amount) / 1000000000.0) AS usd_value
                 FROM withdrawals w
                   LEFT JOIN slots s ON w.slot_id = s.id
                 GROUP BY
                   w.slot_id, s.stamp
                 ORDER BY
                   w.slot_id DESC
                 LIMIT 100`);
	    res.render('slots', {
		withdrawalsPerSlot: s.rows,
		page: 'slots'
	    });

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
