const pg = require('pg');
const axios = require('axios');
const config = require('../config');

(async () => {
    const client = new pg.Client(config.postgres);
    await client.connect();

    let res;

    res = await client.query('SELECT COUNT(*) FROM validators');
    console.log(res.rows[0].count, 'validators');

    res = await client.query('SELECT COUNT(*) FROM slots');
    console.log(res.rows[0].count, 'slots');

    res = await client.query('SELECT COUNT(*) FROM withdrawals');
    console.log(res.rows[0].count, 'withdrawals');

    res = await client.query('SELECT COUNT(*) FROM prices');
    console.log(res.rows[0].count, 'prices');

    res = await client.query('SELECT stamp FROM slots ORDER BY id DESC LIMIT 1');
    console.log(res.rows[0].stamp, 'latest slot');

    //res = await client.query('SELECT SUM((SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, s.stamp))) LIMIT 1) * (w.amount / 1000000000.0)) AS total FROM withdrawals w LEFT JOIN slots s ON w.slot_id = s.id');
    //console.log(res.rows[0].total, 'total USD received');

    await client.end();
})();
