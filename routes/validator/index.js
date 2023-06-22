const db = require('../../db');

module.exports = {
    get: async (req, res, next) => {
	try {
	    const { id } = req.params;

	    if (!id)
		throw new Error('Missing validator id');

	    const v = await db.query('SELECT * FROM validators WHERE id = $1', [id]);

	    if (v.rows.length != 1)
		throw new Error('Validator not in database!');

	    const w = await db.query(
		`SELECT
                   s.stamp, w.id, w.slot_id, w.address, w.amount / 1000000000.0 AS amount,
                   SUM((SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, s.stamp))) LIMIT 1) * (w.amount / 1000000000.0)) AS usd_value
                 FROM
                   withdrawals w
                     LEFT JOIN slots s ON w.slot_id = s.id
                     LEFT JOIN validators v ON w.validator_id = v.id
                 WHERE
                   v.id = $1
                 GROUP BY
                   s.stamp, v.id, w.id, w.slot_id, w.address, w.amount
                 ORDER BY
                    w.slot_id DESC;`, [id]
	    );
	    res.render('validator', {
		validator: v.rows[0],
		withdrawals: w.rows,
		page: 'validator'
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
