const pg = require('pg');
const axios = require('axios');

const main = async (id) => {
    const client = new pg.Client({
	host: '127.0.0.1',
	port: 5432,
	database: 'staking_dev',
	user: 'staking',
	password: process.env.DB_PASS,
    });

    await client.connect();

    const res = await client.query('SELECT id, pubkey FROM validators WHERE id = $1', [id]);
    if (res.rows && res.rows.length == 0) {
	const o = await axios.get('http://127.0.0.1:3500/eth/v1/beacon/states/finalized/validators/' + id);

	const pubkey = o.data.data.validator.pubkey;
	console.log('adding', id, pubkey);
	await client.query('INSERT INTO validators (id, pubkey) VALUES ($1, $2)', [id, pubkey]);

    }
    else
	console.log('validator', id, 'already added');

    await client.end();
};

if (process.argv[2]) {
    const id = process.argv[2];
    if (id.match(/^\d+$/))
	main(id);
    else
	console.log('the validator index must be a number');
}
else
    console.log('usage: node add-validator 1234');
