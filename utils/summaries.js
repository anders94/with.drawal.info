const db = require('../db');

(async () => {
    let tmp;

    // latest withdrawals
    tmp = await db.query(
	`SELECT
           w.slot_id, validator_id, w.address, w.amount / 1000000000.0 AS eth_amount,
           (SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, s.stamp))) LIMIT 1) * (w.amount / 1000000000.0) AS usd_amount
         FROM
           withdrawals w
             LEFT JOIN slots s ON w.slot_id = s.id
         ORDER BY
           slot_id desc, validator_id desc
         LIMIT 32`);

    await db.query('BEGIN');
    await db.query('DELETE FROM summaries WHERE summary = $1', ['latest-withdrawals']);
    for (let i=0; i<tmp.rows.length; i++) {
	const row = tmp.rows[i];
	console.log('latest-withdrawals', i, row.slot_id, row.validator_id, row.address, row.eth_amount, row.usd_amount);
	await db.query(
	    `INSERT INTO summaries
               (summary, ordinal, slot_id, validator_id, address, eth_amount, usd_amount)
             VALUES
               ($1, $2, $3, $4, $5, $6, $7)`,
	    ['latest-withdrawals', i, row.slot_id, row.validator_id, row.address, row.eth_amount, row.usd_amount]);
	
    }
    await db.query('COMMIT');

    // largest withdrawals
    tmp = await db.query(
	`SELECT
           w.slot_id, validator_id, w.address, w.amount / 1000000000.0 AS eth_amount,
           (SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, s.stamp))) LIMIT 1) * (w.amount / 1000000000.0) AS usd_amount
         FROM
           withdrawals w
             LEFT JOIN slots s ON w.slot_id = s.id
         ORDER BY
           w.amount desc
         LIMIT 32`);

    await db.query('BEGIN');
    await db.query('DELETE FROM summaries WHERE summary = $1', ['largest-withdrawals']);
    for (let i=0; i<tmp.rows.length; i++) {
	const row = tmp.rows[i];
	console.log('largest-withdrawals', i, row.slot_id, row.validator_id, row.address, row.eth_amount, row.usd_amount);
	await db.query(
	    `INSERT INTO summaries
               (summary, ordinal, slot_id, validator_id, address, eth_amount, usd_amount)
             VALUES
               ($1, $2, $3, $4, $5, $6, $7)`,
	    ['largest-withdrawals', i, row.slot_id, row.validator_id, row.address, row.eth_amount, row.usd_amount]);
	
    }
    await db.query('COMMIT');

    // total withdrawals by address
    tmp = await db.query(
	`SELECT
           w.address, SUM(w.amount / 1000000000.0) AS eth_amount,
           SUM((SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, s.stamp))) LIMIT 1) * (w.amount / 1000000000.0)) AS usd_amount
         FROM
           withdrawals w
             LEFT JOIN slots s ON w.slot_id = s.id
         GROUP BY
           w.address
         ORDER BY
           eth_amount DESC
         LIMIT 32`);

    await db.query('BEGIN');
    await db.query('DELETE FROM summaries WHERE summary = $1', ['total-withdrawals-by-address']);
    for (let i=0; i<tmp.rows.length; i++) {
	const row = tmp.rows[i];
	console.log('total-withdrawals-by-address', i, row.address, row.eth_amount, row.usd_amount);
	await db.query(
	    `INSERT INTO summaries
               (summary, ordinal, address, eth_amount, usd_amount)
             VALUES
               ($1, $2, $3, $4, $5)`,
	    ['total-withdrawals-by-address', i, row.address, row.eth_amount, row.usd_amount]);
	
    }
    await db.query('COMMIT');

    await db.end();

})();
