const pg = require('pg');
const axios = require('axios');

(async () => {
    const client = new pg.Client({
	host: '127.0.0.1',
	port: 5432,
	database: 'staking_dev',
	user: 'staking',
	password: process.env.DB_PASS,
    });

    await client.connect();

    let res;
    let currentSlot = 6209535;

    // get current slot
    res = await client.query('SELECT v FROM config WHERE k = $1', ['last slot processed']);
    if (res.rows.length == 0) // shapella (withdrawal unlock) was at epoch 194048 slot 6209536
	await client.query('INSERT INTO config (k, v) VALUES ($1, $2)', ['last slot processed', 6209535]);
    else
	currentSlot = Number(res.rows[0].v);
    console.log('current slot:', currentSlot);

    // get latest slot
    tmp = await axios.get('http://localhost:3500/eth/v2/beacon/blocks/finalized');
    const latestSlot = Number(tmp.data.data.message.slot);
    console.log('latest slot:', latestSlot);

    // get an array of our validators
    res = await client.query('SELECT id, pubkey FROM validators ORDER BY id ASC');
    if (res.rows.length == 0)
	throw new Error('No validators found!')
    const validators = res.rows;
    console.log('validators');
    for (const validator of validators)
	console.log(' ', validator.id, validator.pubkey);

    // iterate from currentSlot to latestSlot and get withdrawals
      // check our validators against each withdrawal and insert ones we don't have

/*

    res = await axios.get('http://127.0.0.1:3500/eth/v2/beacon/blocks/6553818');

    const withdrawals = res.data.data.message.body.execution_payload.withdrawals;
    for (const withdrawal of withdrawals) {
	console.log(withdrawal);
    }
*/

    await client.end()

})();
