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

    try {
	console.log('start', new Date());

	await client.connect();

	await client.query('BEGIN');

	let res;
	let start;
	const end = new Date().getTime();

	// get date of last price
	res = await client.query('SELECT stamp FROM prices ORDER BY stamp DESC LIMIT 1');
	if (res.rows.length == 1) // shapella (withdrawal unlock) was at epoch 194048 slot 6209536
	    start = new Date(res.rows[0].stamp).getTime();
	else
	    start = sub(end, {days: 1});

	// remove all pricings on slots newer than the newest price we have
	client.query('UPDATE slots SET price_id = NULL WHERE stamp > $1', [start]);

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

	console.log('updating slots that don\'t yet have prices');
	await client.query(
	    `UPDATE slots s
               SET price_id = (SELECT id FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, s.stamp))) LIMIT 1)
             WHERE s.price_id IS NULL;`
	);

	client.query('COMMIT');

    }
    catch (e) {
	client.query('ROLLBACK');
	console.log(e);

    }
    finally {
	console.log('end', new Date());

	await client.end();
    }
})();
