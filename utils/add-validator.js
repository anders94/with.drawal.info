const axios = require('axios');
const db = require('../db');
const config = require('../config');

const main = async (id) => {
    const res = await db.query('SELECT id, pubkey FROM validators WHERE id = $1', [id]);
    if (res.rows && res.rows.length == 0) {
	const o = await axios.get(config.ethrpc.url + '/eth/v1/beacon/states/finalized/validators/' + id);

	const pubkey = o.data.data.validator.pubkey;
	console.log('adding', id, pubkey);
	//await db.query('INSERT INTO validators (id, pubkey) VALUES ($1, $2)', [id, pubkey]);

    }
    else
	console.log('validator', id, 'already added');

    await db.end();
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
