const db = require('../../db');

module.exports = {
    get: async (req, res, next) => {
	try {
	    const w = await db.query(
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
                   (sp.slot_id / 32) AS epoch,
                   SUM(w.amount * sp.price / 1000000000.0) AS usd_amount
                 FROM
                   slot_prices sp
                     LEFT JOIN withdrawals w ON w.slot_id = sp.slot_id
                 GROUP BY epoch
                 ORDER BY epoch DESC
                 LIMIT 500`);

	    w.rows.pop(); // remove last element which is probably an incomplete epoch

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
