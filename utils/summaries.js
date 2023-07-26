const db = require('../db');

(async () => {
    let tmp;

    // assign a price to each slot (will be blown away later as new pricing comes in
    await db.query(
	`UPDATE slots s
           SET price_id = (SELECT id FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, s.stamp))) LIMIT 1)
         WHERE s.price_id IS NULL;`
    );

    // latest withdrawals
    /*
    tmp = await db.query(
	`SELECT
           w.slot_id, validator_id, w.address, w.amount / 1000000000.0 AS eth_amount,
           (w.amount / 1000000000.0) * p.price as usd_amount
         FROM
           withdrawals w
             LEFT JOIN slots s ON w.slot_id = s.id
             LEFT JOIN prices p ON s.price_id = p.id
         ORDER BY slot_id DESC, validator_id DESC
         LIMIT 100`);

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
    */

    /*
    // largest withdrawals
    tmp = await db.query(
	`SELECT
           w.slot_id, validator_id, w.address, w.amount / 1000000000.0 AS eth_amount,
           (w.amount / 1000000000.0) * p.price AS usd_amount
         FROM
           withdrawals w
             LEFT JOIN slots s ON w.slot_id = s.id
             LEFT JOIN prices p ON s.price_id = p.id
         ORDER BY w.amount DESC
         LIMIT 100`);

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
    */

    // largest withdrawals per epoch
    tmp = await db.query(
	`WITH slot_prices AS (
               SELECT
                 s.id AS slot_id,
                 COALESCE(p.price, (SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, s.stamp))) LIMIT 1)) AS price
               FROM
                 slots s
                   LEFT JOIN prices p ON s.price_id = p.id
             )
             SELECT
               COUNT(sp.slot_id) AS slots,
               (sp.slot_id / 32) AS epoch,
               SUM(w.amount / 1000000000.0) AS eth_amount,
               SUM(w.amount * sp.price / 1000000000.0) AS usd_amount
             FROM
               slot_prices sp
                 LEFT JOIN withdrawals w ON w.slot_id = sp.slot_id
             GROUP BY epoch
             ORDER BY usd_amount DESC
             LIMIT 100;`);

    await db.query('BEGIN');
    await db.query('DELETE FROM summaries WHERE summary = $1', ['largest-withdrawals-by-epoch']);
    for (let i=0; i<tmp.rows.length; i++) {
	const row = tmp.rows[i];
	console.log('largest-withdrawals-by-epoch', i, row.slots, row.epoch, row.eth_amount, row.usd_amount);
	await db.query(
	    `INSERT INTO summaries
               (summary, ordinal, slots, epoch, eth_amount, usd_amount)
             VALUES
               ($1, $2, $3, $4, $5, $6)`,
	    ['largest-withdrawals-by-epoch', i, row.slots, row.epoch, row.eth_amount, row.usd_amount]);

    }
    await db.query('COMMIT');

    // total withdrawals by address
    tmp = await db.query(
	`SELECT
           w.address, SUM(w.amount / 1000000000.0) AS eth_amount,
           SUM((w.amount / 1000000000.0) * p.price) AS usd_amount
         FROM
           withdrawals w
             LEFT JOIN slots s ON w.slot_id = s.id
             LEFT JOIN prices p ON s.price_id = p.id
         GROUP BY
           w.address
         ORDER BY
           eth_amount DESC
         LIMIT 100`);

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
