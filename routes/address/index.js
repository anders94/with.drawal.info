const db = require('../../db');

module.exports = {
    get: async (req, res, next) => {
	try {
	    const { address } = req.params;

	    if (!address)
		throw new Error('Missing address');

	    const w = await db.query(
		`SELECT
                   s.stamp, w.id, w.slot_id, w.address, w.amount / 1000000000.0 AS amount,
                   SUM(COALESCE(p.price, (SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, s.stamp))) LIMIT 1)) * (w.amount / 1000000000.0)) AS usd_value
                 FROM
                   withdrawals w
                     LEFT JOIN slots s ON w.slot_id = s.id
                     LEFT JOIN prices p ON s.price_id = p.id
                     LEFT JOIN validators v ON w.validator_id = v.id
                 WHERE
                   w.address = $1
                 GROUP BY
                   s.stamp, v.id, w.id, w.slot_id, w.address, w.amount
                 ORDER BY
                    w.slot_id DESC
                 LIMIT 1000`, [address]
	    );
	    res.render('address', {
		address: address,
		withdrawals: w.rows,
		page: 'address'
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
