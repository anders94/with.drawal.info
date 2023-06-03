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

    const res = await client.query('SELECT id, pubkey FROM validators ORDER BY id ASC');
    if (res.rows)
	for (const row of res.rows)
	    console.log(row.id, row.pubkey);

    await client.end();
})();
