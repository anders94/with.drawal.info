const db = require('../../db');

module.exports = {
    get: async (req, res, next) => {
	try {
	    const { id } = req.params;

	    if (!id)
		throw new Error('Missing slot id');

	    const s = await db.query(
		`SELECT
                   s.id, s.stamp, COALESCE(p.price, (SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, s.stamp))) LIMIT 1)) AS price
                 FROM slots s
                   LEFT JOIN prices p ON s.price_id = p.id
                 WHERE s.id = $1`, [id]);

	    if (s.rows.length != 1)
		throw new Error('Slot ' + id + ' not in database!');

	    const w = await db.query(
		`SELECT
                   id, validator_id, address, amount
                 FROM withdrawals
                 WHERE slot_id = $1
                 ORDER BY id ASC`, [id]
	    );
	    res.render('slot', {
		slot: s.rows[0],
		withdrawals: w.rows,
		page: 'slot'
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
