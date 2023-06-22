const db = require('../../db');

module.exports = {
    get: async (req, res, next) => {
	try {
	    const w = await db.query(
		`SELECT
                   s.stamp, w.id, v.id AS validator_id, w.slot_id, w.address, w.amount / 1000000000.0 AS amount,
                   SUM((SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, s.stamp))) LIMIT 1) * (w.amount / 1000000000.0)) AS usd_value
                 FROM
                   withdrawals w
                     LEFT JOIN slots s ON w.slot_id = s.id
                     LEFT JOIN validators v ON w.validator_id = v.id
                     LEFT JOIN users2validators u2v ON v.id = u2v.validator_id
                 WHERE u2v.user_id = $1
                 GROUP BY
                   s.stamp, v.id, w.id, w.slot_id, w.address, w.amount
                 ORDER BY
                    w.slot_id DESC
                 LIMIT 500;`,
		['d3381029-a22f-4c5f-85aa-6b80bdcadb4f']
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
                   s.stamp, w.id, v.id AS validator_id, w.slot_id, w.address, w.amount / 1000000000.0 AS amount,
                   SUM((SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, s.stamp))) LIMIT 1) * (w.amount / 1000000000.0)) AS usd_value
                 FROM
                   withdrawals w
                     LEFT JOIN slots s ON w.slot_id = s.id
                     LEFT JOIN validators v ON w.validator_id = v.id
                     LEFT JOIN users2validators u2v ON v.id = u2v.validator_id
                 WHERE
                   s.stamp >= $1 AND
                   s.stamp <= $2 AND
                   u2v.user_id = $3
                 GROUP BY
                   s.stamp, v.id, w.id, w.slot_id, w.address, w.amount
                 ORDER BY
                    w.slot_id DESC;`,
		[start, end, 'd3381029-a22f-4c5f-85aa-6b80bdcadb4f']
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
