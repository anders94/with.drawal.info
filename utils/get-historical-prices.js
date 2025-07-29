const pg = require('pg');
const axios = require('axios');
const config = require('../config');

(async () => {
    const client = new pg.Client(config.postgres);

    await client.connect();

    const start = new Date('2025-03-01T00:00:00.000Z').getTime() / 1000;
    const end = new Date('2025-04-01T00:00:00.000Z').getTime() / 1000;

    let res;
    res = await axios.get('https://api.coingecko.com/api/v3/coins/ethereum/market_chart/range?vs_currency=usd&from=' + start + '&to=' + end);

    if (res.data && res.data.prices) {
	const prices = res.data.prices;
	for (const price of prices) {
	    console.log(new Date(price[0]), price[1]);
	    res = await client.query('SELECT price, stamp FROM prices WHERE stamp = $1', [new Date(price[0])]);
	    if (res.rows.length == 0)
		await client.query('INSERT INTO prices (stamp, price) VALUES ($1, $2)', [new Date(price[0]), price[1]]);
	    else
		console.log('already have a price for', res.rows[0].stamp);

	}

    }

/*    
    const res = await client.query('SELECT id, pubkey FROM validators WHERE id = $1', [id]);
    if (res.rows && res.rows.length == 0) {
	const o = await axios.get('http://127.0.0.1:3500/eth/v1/beacon/states/finalized/validators/' + id);

	const pubkey = o.data.data.validator.pubkey;
	console.log('adding', id, pubkey);
	await client.query('INSERT INTO validators (id, pubkey) VALUES ($1, $2)', [id, pubkey]);

    }
    else
	console.log('validator', id, 'already added');
*/

    await client.end();
})();
