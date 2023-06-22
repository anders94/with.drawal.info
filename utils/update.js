const axios = require('axios');
const db = require('../db');

const sleep = async (ms) => new Promise(resolve => setTimeout(resolve, ms));

const delay = 10;
const beaconURL = 'http://localhost:3500';

(async () => {
    let tmp;

    tmp = await axios.get(beaconURL + '/eth/v2/beacon/blocks/finalized');

    const latestSlot = tmp.data.data.message.slot;

    // slots
    //   first with a 0 timestamp is 4636671
    //   first with a standard timestamp is 4700013 (2022-09-15T06:42:59.000Z)
    //   first with a withdrawal is 6209540 (2023-04-12T22:28:23.000Z)

    let slot = 6209540;

    tmp = await db.query('SELECT id FROM slots ORDER BY id DESC LIMIT 1');
    if (tmp && tmp.rows && tmp.rows.length > 0)
	slot = Number(tmp.rows[0].id);

    for (; slot < latestSlot; slot++) {
	console.log('working on slot', slot);
	try {
	    tmp = await axios.get(beaconURL + '/eth/v2/beacon/blocks/' + slot);

	    if (tmp.data && tmp.data.data && tmp.data.data.message &&
		tmp.data.data.message.body && tmp.data.data.message.body.execution_payload &&
		tmp.data.data.message.body.execution_payload.timestamp != 0) {

		const body = tmp.data.data.message.body;
		const withdrawals = body.execution_payload.withdrawals;

		// find the last processed slot (re-run the last one in case of missed withdrawals)
		tmp = await db.query('SELECT id FROM slots WHERE id = $1', [slot]);
		if (tmp.rows.length == 0) {
		    // add missing slot
		    console.log('  adding slot', slot, new Date(body.execution_payload.timestamp * 1000));
		    await db.query('INSERT INTO slots ' +
				   '  (id, stamp) ' +
				   'VALUES ' +
				   '  ($1, $2)',
				   [slot, new Date(body.execution_payload.timestamp * 1000)]);

		}

		if (withdrawals && withdrawals.length > 0) {
		    for (const withdrawal of withdrawals) {
			// see if we already have this withdrawal
			tmp = await db.query('SELECT * FROM withdrawals WHERE id = $1',
					     [withdrawal.index]);
			if (tmp.rows.length == 0) {
			    console.log('  adding withdrawal', withdrawal.index, 'for validator',
					withdrawal.validator_index, 'of', withdrawal.amount, 'to',
					withdrawal.address);

			    tmp = await db.query('SELECT id FROM validators WHERE id = $1',
						 [withdrawal.validator_index]);
			    if (tmp && tmp.rows && tmp.rows.length == 0) {
				// add missing validator
				tmp = await axios.get(beaconURL + '/eth/v1/beacon/states/finalized/validators/' +
						      withdrawal.validator_index);
				if (tmp && tmp.data && tmp.data.data && tmp.data.data.validator)
				    await db.query('INSERT INTO validators (id, pubkey) VALUES ($1, $2)',
						   [tmp.data.data.index, tmp.data.data.validator.pubkey]);
				else
				    console.log('ERROR: couldn\'t add validator',
						withdrawal.validator_index, 'got', tmp);
			    }

			    // add the withdrawal
			    await db.query('INSERT INTO withdrawals ' +
					   '  (id, slot_id, validator_id, address, amount) ' +
					   'VALUES ' +
					   '  ($1, $2, $3, $4, $5)',
					   [withdrawal.index, slot, withdrawal.validator_index,
					    withdrawal.address, withdrawal.amount]);

			}
			else
			    console.log(tmp && tmp.rows ? 'we already have this withdrawal' : 'some issue with the db result ' + tmp);

		    }

		}

	    }
	    else
		console.log('skipping slot', slot);

	}
	catch (e) {
	    if (e.code != 'ERR_BAD_REQUEST')
		console.log(e);

	}
	finally {
	    await sleep(delay);

	}

    }

    await db.end();

})();
