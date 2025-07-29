const pg = require('pg');
const axios = require('axios');
const config = require('../config');

(async () => {
    const client = new pg.Client(config.postgres);
    await client.connect();

    const res = await client.query('SELECT id, pubkey FROM validators ORDER BY id ASC');
    if (res.rows) {
	for (const row of res.rows)
	    console.log(row.id, row.pubkey);

	console.log('  total:', res.rows.length);

    }

    await client.end();
})();
