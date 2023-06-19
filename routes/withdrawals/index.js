const db = require('../../db');

module.exports = {
    get: async (req, res, next) => {
	try {
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
                    w.epoch_id DESC
                 LIMIT 500;`
	    );
	    res.render('withdrawals', {
		withdrawals: w.rows,
		page: 'withdrawals'
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
	    const w = await db.query(
		`SELECT
                   e.stamp, w.id, v.id AS validator_id, w.epoch_id, w.address, w.amount / 1000000000.0 AS amount,
                   SUM((SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, e.stamp))) LIMIT 1) * (w.amount / 1000000000.0)) AS usd_value
                 FROM
                   withdrawals w
                     LEFT JOIN epochs e ON w.epoch_id = e.id
                     LEFT JOIN validators v ON w.validator_id = v.id
                 WHERE
                   e.stamp >= $1 AND
                   e.stamp <= $2
                 GROUP BY
                   e.stamp, v.id, w.id, w.epoch_id, w.address, w.amount
                 ORDER BY
                    w.epoch_id DESC;`,
		[start, end]
	    );
	    res.render('withdrawals', {
		withdrawals: w.rows,
		page: 'withdrawals',
		start: start,
		end: end
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
