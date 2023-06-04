const pg = require('pg');
const axios = require('axios');
const sub = require('date-fns/sub');

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

    const end = new Date().getTime();
    const start = sub(end, {days: 1});

    let res;
    res = await axios.get('https://api.coingecko.com/api/v3/coins/ethereum/market_chart/range?vs_currency=usd&from=' + (start / 1000) + '&to=' + (end / 1000));

    if (res.data && res.data.prices) {
	const prices = res.data.prices;
	for (const price of prices) {
	    console.log(' ', new Date(price[0]), price[1]);
	    res = await client.query('SELECT price, stamp FROM prices WHERE stamp = $1', [new Date(price[0])]);
	    if (res.rows.length == 0)
		await client.query('INSERT INTO prices (stamp, price) VALUES ($1, $2)', [new Date(price[0]), price[1]]);
	    else
		console.log('  already have a price for', res.rows[0].stamp);

	}

    }

    console.log('end', new Date());

    await client.end();
})();
