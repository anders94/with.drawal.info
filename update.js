const pg = require('pg');
const axios = require('axios');

const delay = 100;

const sleep = async (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    const client = new pg.Client({
	host: '127.0.0.1',
	port: 5432,
	database: 'staking_dev',
	user: 'staking',
	password: process.env.DB_PASS,
    });

    console.log('start', new Date());

    await client.connect();

    let res;
    let currentSlot = 6209535;

    // get last slot processed
    res = await client.query('SELECT v FROM config WHERE k = $1', ['last slot processed']);
    if (res.rows.length == 0) { // shapella (withdrawal unlock) was at epoch 194048 slot 6209536
	currentSlot = 6209535;
	await client.query('INSERT INTO config (k, v) VALUES ($1, $2)', ['last slot processed', currentSlot]);
    }
    else
	currentSlot = Number(res.rows[0].v);

    // get latest finalized slot
    tmp = await axios.get('http://localhost:3500/eth/v2/beacon/blocks/finalized');
    const latestSlot = Number(tmp.data.data.message.slot);

    // get an array of our validators
    res = await client.query('SELECT id, pubkey FROM validators ORDER BY id ASC');
    if (res.rows.length == 0)
	throw new Error('No validators found!')
    const validators = res.rows;
    console.log('  ', validators.length, 'validators configured');

    // iterate from currentSlot to latestSlot and get withdrawals
    for (; currentSlot < latestSlot; currentSlot++) {
	console.log('    working on slot', currentSlot, 'of', latestSlot);
	const epoch = Math.floor(currentSlot / 32);

	res = await client.query('SELECT stamp FROM epochs WHERE id = $1', [epoch]);
	if (res.rows.length == 0) {
	    let tmp = await axios.get('https://beaconcha.in/api/v1/epoch/' + epoch);
	    console.log('      inserting epoch', epoch, 'with timestamp', tmp.data.data.ts);
	    await client.query('INSERT INTO epochs (id, stamp) VALUES ($1, $2)', [epoch, tmp.data.data.ts]);
	}

	try {
	    res = await axios.get('http://127.0.0.1:3500/eth/v2/beacon/blocks/' + currentSlot);
	    if (res.data && res.data.data && res.data.data.message && res.data.data.message.body && res.data.data.message.body.execution_payload) {
		const withdrawals = res.data.data.message.body.execution_payload.withdrawals;
		if (withdrawals && withdrawals.length) {
		    // check our validators against each withdrawal and insert ones we don't have
		    for (const withdrawal of withdrawals) {
			for (const validator of validators) {
			    if (validator.id == withdrawal.validator_index) {
				console.log('      adding withdrawal for validator', validator.id, 'of', withdrawal.amount, 'to', withdrawal.address);
				await client.query('INSERT INTO withdrawals (id, epoch_id, validator_id, address, amount) VALUES ($1, $2, $3, $4, $5)',
						   [withdrawal.index, epoch, withdrawal.validator_index, withdrawal.address, withdrawal.amount]);

			    }

			}

		    }

		}

	    }
	    else
		console.log(res.data);

	}
	catch (err) {
	    if (err.response && err.response.status == 404) {
		//console.log('not found');
	    }
	    else
		console.log(err);

	}

	await client.query('UPDATE config SET v = $2 WHERE k = $1', ['last slot processed', currentSlot]);

	await sleep(delay);

    }

    console.log('done', new Date());

    await client.end()

})();
