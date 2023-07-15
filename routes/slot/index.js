const db = require('../../db');
const id = require('./id');

module.exports = {
    id: id,
    get: async (req, res, next) => {
	try {
	    const s = await db.query(
		`SELECT
                   w.slot_id, s.stamp, SUM(w.amount) / 1000000000.0 AS eth_value,
                   COALESCE(p.price, (SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, s.stamp))) LIMIT 1)) * (SUM(w.amount) / 1000000000.0) AS usd_value
                 FROM withdrawals w
                   LEFT JOIN slots s ON w.slot_id = s.id
                   LEFT JOIN prices p ON s.price_id = p.id
                 GROUP BY
                   w.slot_id, s.stamp, p.price
                 ORDER BY
                   w.slot_id DESC
                 LIMIT 2500`);
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
    },
    post: async (req, res, next) => {
	const { start, end } = req.body;

	if (!start || !end)
	    throw new Error('Missing start and end date.');

	try {
	    const s = await db.query(
		`SELECT
                   w.slot_id, s.stamp, SUM(w.amount) / 1000000000.0 AS eth_value,
                   COALESCE(p.price, (SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, s.stamp))) LIMIT 1)) * (SUM(w.amount) / 1000000000.0) AS usd_value
                 FROM withdrawals w
                   LEFT JOIN slots s ON w.slot_id = s.id
                   LEFT JOIN prices p ON s.price_id = p.id
                 WHERE
                   s.stamp >= $1 AND
                   s.stamp <= $2
                 GROUP BY
                   w.slot_id, s.stamp, p.price
                 ORDER BY
                   w.slot_id DESC
                 LIMIT 2500`,
		[start, end]);
	    res.render('slots', {
		withdrawalsPerSlot: s.rows,
		start: start,
		end: end,
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
