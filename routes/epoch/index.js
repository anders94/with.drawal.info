const db = require('../../db');
const id = require('./id');

module.exports = {
    id: id,
    get: async (req, res, next) => {
	try {
	    const s = await db.query(
		`WITH slot_prices AS (
                   SELECT
                     s.id AS slot_id,
                     COALESCE(p.price, (SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, s.stamp))) LIMIT 1)) AS price
                   FROM
                     slots s
                       LEFT JOIN prices p ON s.price_id = p.id
                   ORDER BY slot_id DESC
                   LIMIT 4096
                 )
                 SELECT
                   COUNT(sp.slot_id) AS slots,
                   (sp.slot_id / 32) AS epoch,
                   SUM(w.amount / 1000000000.0) AS eth_amount,
                   SUM(w.amount * sp.price / 1000000000.0) AS usd_amount
                 FROM
                   slot_prices sp
                     LEFT JOIN withdrawals w ON w.slot_id = sp.slot_id
                 GROUP BY epoch
                 ORDER BY epoch DESC
                 LIMIT 500`);
	    res.render('epochs', {
		withdrawalsPerEpoch: s.rows,
		page: 'epochs'
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
		`WITH slot_prices AS (
                   SELECT
                     s.id AS slot_id,
                     COALESCE(p.price, (SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, s.stamp))) LIMIT 1)) AS price
                   FROM
                     slots s
                       LEFT JOIN prices p ON s.price_id = p.id
                   WHERE s.stamp >= $1
                     AND s.stamp <= $2
                   ORDER BY slot_id DESC
                   LIMIT 4096
                 )
                 SELECT
                   COUNT(sp.slot_id) AS slots,
                   (sp.slot_id / 32) AS epoch,
                   SUM(w.amount / 1000000000.0) AS eth_amount,
                   SUM(w.amount * sp.price / 1000000000.0) AS usd_amount
                 FROM
                   slot_prices sp
                     LEFT JOIN withdrawals w ON w.slot_id = sp.slot_id
                 GROUP BY epoch
                 ORDER BY epoch DESC
                 LIMIT 500`,
		[start, end]);
	    res.render('epochs', {
		withdrawalsPerEpoch: s.rows,
		start: start,
		end: end,
		page: 'epochs'
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
