const db = require('../db');
const axios = require('axios');
const config = require('../config');

const max = 1856701;

// find last validator: curl http://10.20.2.2:3500/eth/v1/beacon/states/finalized/validators | tail -c 750

const add = async (id) => {
    const o = await axios.get(config.ethrpc.url + '/eth/v1/beacon/states/finalized/validators/' + id);
    if (o && o.data && o.data.data && o.data.data.validator && o.data.data.validator.pubkey) {
	const pubkey = o.data.data.validator.pubkey;
	console.log('adding', id, pubkey);
	await db.query('INSERT INTO validators (id, pubkey) VALUES ($1, $2)', [id, pubkey]);
	await db.query('UPDATE config SET v=$2 WHERE k=$1', ['last validator added', id]);

    }
    else
	console.log('didn\'t find', id);

};

(async () => {
    let res;
    let min = 0;
    let counter = 0;

    res = await db.query('SELECT v FROM config WHERE k = $1', ['last validator added']);

    if (res.rows && res.rows.length == 1)
	min = Number(res.rows[0].v);
    else
	await db.query('INSERT INTO config (k, v) VALUES ($1, $2)', ['last validator added', 0]);

    console.log('working from', min, 'to', max);
    for (let x=min; x<max; x++) {
	console.log('working on', x);
	res = await db.query('SELECT id, pubkey FROM validators WHERE id = $1', [x]);
	if (res.rows && res.rows.length == 0) {
	    console.log('didn\'t find', x, 'adding...');
	    counter++;
	    add(x);

	}

    }
    console.log('tried to add', counter);

    await db.end();

})();
