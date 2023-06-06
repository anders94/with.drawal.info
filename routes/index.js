const db = require('../db');

module.exports = {
    index: async (req, res, next) => {
	try {
	    const v = await db.query(
		`SELECT
                   v.id, v.pubkey,
                   SUM((SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, e.stamp))) LIMIT 1) * (w.amount / 1000000000.0)) AS total
                 FROM
                   withdrawals w
                     LEFT JOIN epochs e ON w.epoch_id = e.id
                     LEFT JOIN validators v ON w.validator_id = v.id
                 GROUP BY v.id`
	    );
	    res.render('index', {
		validators: v.rows
	    });
	}
	catch (e) {
	    console.log(e);
	    res.render('error', {error: e});
	}
	finally {
	    return next;
	}
    },
    validator: async (req, res, next) => {
	try {
	    const { id } = req.params;

	    if (!id)
		throw new Error('Missing validator id');

	    const v = await db.query('SELECT * FROM validators WHERE id = $1', [id]);
	    const w = await db.query(
		`SELECT
                   e.stamp, w.id, w.epoch_id, w.address, w.amount / 1000000000.0 AS amount,
                   SUM((SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, e.stamp))) LIMIT 1) * (w.amount / 1000000000.0)) AS usd_value
                 FROM
                   withdrawals w
                     LEFT JOIN epochs e ON w.epoch_id = e.id
                     LEFT JOIN validators v ON w.validator_id = v.id
                 WHERE
                   v.id = $1
                 GROUP BY
                   e.stamp, v.id, w.id, w.epoch_id, w.address, w.amount
                 ORDER BY
                    w.epoch_id ASC;`, [id]
	    );
	    res.render('validator', {
		validator: v.rows[0],
		withdrawals: w.rows
	    });

	}
	catch (e) {
	    console.log(e);
	    res.render('error', {error: e});
	}
	finally {
	    return next;
	}
    },
    withdrawals: async (req, res, next) => {
	try {
	    //const { id } = req.params;

	    //if (!id)
		//throw new Error('Missing validator id');

	    const w = await db.query(
		`SELECT
                   e.stamp, w.id, v.id AS validator_id, w.epoch_id, w.address, w.amount / 1000000000.0 AS amount,
                   SUM((SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, e.stamp))) LIMIT 1) * (w.amount / 1000000000.0)) AS usd_value
                 FROM
                   withdrawals w
                     LEFT JOIN epochs e ON w.epoch_id = e.id
                     LEFT JOIN validators v ON w.validator_id = v.id
                 GROUP BY
                   e.stamp, v.id, w.id, w.epoch_id, w.address, w.amount
                 ORDER BY
                    w.epoch_id DESC;`
	    );
	    res.render('withdrawals', {
		withdrawals: w.rows
	    });

	}
	catch (e) {
	    console.log(e);
	    res.render('error', {error: e});
	}
	finally {
	    return next;
	}
    }

};
