const db = require('../db');
const express = require('express');
const router = express.Router();
const cors = require('cors');

const withdrawals = require('./withdrawals');
const search = require('./search');
const validator = require('./validator');
const slot = require('./slot');
const epoch = require('./epoch');
const address = require('./address');
const authenticate = require('./authenticate');
const api = require('./api');

router.get('/', async (req, res, next) => {
    try {
	// Get cached data instead of querying database
	const cachedData = res.locals.homepageCache.getCachedData();
	
	res.render('index', {
	    withdrawalsPerEpoch: cachedData.withdrawalsPerEpoch,
	    latestWithdrawals: cachedData.latestWithdrawals,
	    largestWithdrawals: cachedData.largestWithdrawals,
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
router.get('/dashboard', async (req, res, next) => {
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
	res.render('dashboard', {
	    validators: v.rows,
	    page: 'dashboard'
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
router.get('/about', async (req, res, next) => {
    res.render('about', {
	page: 'about'
    });
    return next;
});

router.get('/withdrawals', withdrawals.get);
router.post('/withdrawals', withdrawals.post);

router.post('/search', search.post);

router.get('/validator/:id', validator.get);

router.get('/slots/', slot.get);
router.post('/slots/', slot.post);
router.get('/slot/:id', slot.id.get);

router.get('/epochs/', epoch.get);
router.post('/epochs/', epoch.post);
router.get('/epoch/:id', epoch.id.get);

router.get('/address/:address', address.get);

router.post('/authenticate/signup', authenticate.signup.post);
router.post('/authenticate/login', authenticate.login.post);
router.get('/authenticate/logout', authenticate.logout.get);
router.post('/authenticate/forgotPassword', authenticate.forgotPassword.post);
router.get('/authenticate/nonce', cors(), authenticate.nonce.get);
router.post('/authenticate/verify', cors(), authenticate.verify.post);

router.get('/api/withdrawals.json', api.withdrawals.get);
router.get('/api/epochs.json', api.epochs.get);

module.exports = router;
