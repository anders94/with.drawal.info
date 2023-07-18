const db = require('../../db');

module.exports = {
    get: async (req, res, next) => {
	try {
	    const { id } = req.params;

	    if (!id)
		throw new Error('Missing epoch id');

	    const w = await db.query(
		`WITH slot_prices AS (
                   SELECT
                     s.id AS slot_id,
                     COALESCE(p.price, (SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, s.stamp))) LIMIT 1)) AS price
                   FROM
                     slots s
                       LEFT JOIN prices p ON s.price_id = p.id
                   WHERE s.id / 32 = $1
                   ORDER BY slot_id DESC
                   LIMIT 1024
                 )
                 SELECT
                   sp.slot_id,
                   w.address,
                   w.validator_id,
                   w.amount / 1000000000.0 AS eth_amount,
                   w.amount /1000000000.0 * sp.price AS usd_amount
                 FROM
                   slot_prices sp
                     LEFT JOIN withdrawals w ON w.slot_id = sp.slot_id
                 ORDER BY slot_id DESC`, [id]);

	    if (w.rows.length == 0)
		throw new Error('Epoch not in database!');

	    res.render('epoch', {
		epoch_id: id,
		withdrawals: w.rows,
		page: 'epoch'
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
