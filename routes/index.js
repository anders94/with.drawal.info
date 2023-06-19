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
               SUM((SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, e.stamp))) LIMIT 1) * (w.amount / 1000000000.0)) AS total
             FROM
               withdrawals w
                 LEFT JOIN epochs e ON w.epoch_id = e.id
                 LEFT JOIN validators v ON w.validator_id = v.id
             GROUP BY v.id
             ORDER BY v.id ASC`
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
