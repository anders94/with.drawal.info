const db = require('../db');
const express = require('express');
const router = express.Router();

const withdrawals = require('./withdrawals');
const search = require('./search');
const validator = require('./validator');

router.get('/', async (req, res, next) => {
    try {
	const v = await db.query(
	    `SELECT
               v.id, v.pubkey,
               SUM((SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, s.stamp))) LIMIT 1) * (w.amount / 1000000000.0)) AS total
             FROM
               withdrawals w
                 LEFT JOIN slots s ON w.slot_id = s.id
                 LEFT JOIN validators v ON w.validator_id = v.id
                 LEFT JOIN users2validators u2v ON v.id = u2v.validator_id
             WHERE u2v.user_id = $1
             GROUP BY v.id
             ORDER BY v.id ASC
             LIMIT 32`,
	    ['d3381029-a22f-4c5f-85aa-6b80bdcadb4f']
	);
	res.render('index', {
	    validators: v.rows,
	    page: 'index'
	});
    }
    catch (e) {
	console.log(e);
	res.render('error', {error: e});
    }
    finally {
	return next;
    }
});

router.get('/withdrawals', withdrawals.get);
router.post('/withdrawals', withdrawals.post);

router.post('/search', search.post);

router.get('/validator/:id', validator.get);

module.exports = router;
