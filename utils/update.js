const axios = require('axios');
const db = require('../db');
const config = require('../config');

const sleep = async (ms) => new Promise(resolve => setTimeout(resolve, ms));

const delay = 10;                 // pause between chunks (was: per slot)
const CHUNK = 16;                 // beacon blocks fetched in parallel
const VALIDATOR_CONCURRENCY = 8;  // parallel lookups for unknown validators
// Genuinely empty slots (no block proposed) 404 in streaks of 1-3; dozens in a
// row means the node is missing history (e.g. checkpoint-synced and still
// backfilling). Stop rather than march past it: if we inserted anything beyond
// the hole, resume-from-max would never revisit it - a permanent gap.
const MAX_CONSECUTIVE_404 = 32;
const beaconURL = config.beacon.url;

// headers endpoint needs no execution-payload reconstruction, so it works
// even while the execution client is still backfilling recent blocks
const getFinalizedSlot = async () => {
    const res = await axios.get(beaconURL + '/eth/v1/beacon/headers/finalized');
    return Number(res.data.data.header.message.slot);
};

// thrown when the beacon node has the block but can't serve its execution
// payload yet (execution client still syncing) — stop and resume next run
class NotAvailableYet extends Error {}

// fetch one block; null for 404 (empty/missing slot); retry transient errors
// so a network blip can't silently skip a slot (resume starts at max(id), so a
// skipped middle slot would never be revisited)
const getBlock = async (slot) => {
    for (let attempt = 1; ; attempt++) {
	try {
	    const res = await axios.get(beaconURL + '/eth/v2/beacon/blocks/' + slot);
	    return res.data.data.message;
	}
	catch (e) {
	    if (e.response && e.response.status == 404)
		return null;
	    if (e.response && e.response.status == 400)
		throw new NotAvailableYet('slot ' + slot + ': ' + (e.response.data && e.response.data.message || e.message));
	    if (attempt >= 3)
		throw e;
	    console.log('  retrying slot', slot, 'attempt', attempt, '-', e.message);
	    await sleep(1000 * attempt);
	}
    }
};

// make sure every validator id exists before the withdrawals insert (FK)
const ensureValidators = async (ids) => {
    if (ids.length == 0)
	return;
    const res = await db.query('SELECT id FROM validators WHERE id = ANY($1)', [ids]);
    const have = new Set(res.rows.map(r => Number(r.id)));
    const missing = ids.filter(id => !have.has(Number(id)));

    for (let i = 0; i < missing.length; i += VALIDATOR_CONCURRENCY) {
	const batch = missing.slice(i, i + VALIDATOR_CONCURRENCY);
	const fetched = await Promise.all(batch.map(async (id) => {
	    const r = await axios.get(beaconURL + '/eth/v1/beacon/states/finalized/validators/' + id);
	    return r.data.data;
	}));
	for (const v of fetched) {
	    console.log('    adding validator', v.index);
	    await db.query('INSERT INTO validators (id, pubkey) VALUES ($1, $2) ON CONFLICT DO NOTHING',
			   [v.index, v.validator.pubkey]);
	}
    }
};

// insert the slot and all its withdrawals (one multi-row statement);
// ON CONFLICT DO NOTHING makes re-running any slot harmless
const storeSlot = async (slot, message) => {
    const payload = message.body && message.body.execution_payload;
    if (!payload || payload.timestamp == 0) {
	console.log('skipping slot', slot);
	return 0;
    }

    await db.query('INSERT INTO slots (id, stamp) VALUES ($1, $2) ON CONFLICT DO NOTHING',
		   [slot, new Date(Number(payload.timestamp) * 1000)]);

    const withdrawals = payload.withdrawals || [];
    if (withdrawals.length == 0)
	return 0;

    await ensureValidators([...new Set(withdrawals.map(w => w.validator_index))]);

    const rows = [], params = [];
    withdrawals.forEach((w, i) => {
	const o = i * 5;
	rows.push(`($${o+1}, $${o+2}, $${o+3}, $${o+4}, $${o+5})`);
	params.push(w.index, slot, w.validator_index, w.address, w.amount);
    });
    const res = await db.query('INSERT INTO withdrawals (id, slot_id, validator_id, address, amount) VALUES ' +
			       rows.join(', ') + ' ON CONFLICT DO NOTHING', params);
    return res.rowCount;
};

(async () => {
    // slots
    //   first with a 0 timestamp is 4636671
    //   first with a standard timestamp is 4700013 (2022-09-15T06:42:59.000Z)
    //   first with a withdrawal is 6209540 (2023-04-12T22:28:23.000Z)
    let slot = 6209540;

    const tmp = await db.query('SELECT id FROM slots ORDER BY id DESC LIMIT 1');
    if (tmp && tmp.rows && tmp.rows.length > 0)
	slot = Number(tmp.rows[0].id); // re-run the last slot in case of missed withdrawals

    // optional cap: node utils/update.js [targetSlot] for a bounded run
    const cap = process.argv[2] ? Number(process.argv[2]) : null;

    let target = cap || await getFinalizedSlot();
    const startSlot = slot, t0 = Date.now();
    let inserted = 0;
    let consecutive404 = 0;
    let lastLog = Date.now();

    console.log('beacon:', beaconURL);
    console.log('resuming at slot', slot, '(db) -> target', target,
		cap ? '(cap)' : '(finalized)', '|', (target - slot), 'slots to go');

    while (slot <= target) {
	const slots = [];
	for (let s = slot; s < slot + CHUNK && s <= target; s++)
	    slots.push(s);

	let blocks;
	try {
	    blocks = await Promise.all(slots.map(getBlock));
	}
	catch (e) {
	    if (e instanceof NotAvailableYet) {
		console.log('beacon cannot serve a block yet (' + e.message + ') - stopping here; re-run to resume');
		break;
	    }
	    throw e;
	}
	let holeAt = null;
	for (let i = 0; i < slots.length; i++) {
	    if (blocks[i]) {
		consecutive404 = 0;
		inserted += await storeSlot(slots[i], blocks[i]);
	    }
	    else if (++consecutive404 >= MAX_CONSECUTIVE_404) {
		holeAt = slots[i];
		break;
	    }
	}
	if (holeAt !== null) {
	    console.log(MAX_CONSECUTIVE_404 + ' consecutive missing blocks ending at slot ' + holeAt +
			' - the node is missing history here (still backfilling?). Stopping; re-run to resume.');
	    break;
	}

	slot += slots.length;

	if (Date.now() - lastLog > 10000) {
	    lastLog = Date.now();
	    const rate = (slot - startSlot) / ((Date.now() - t0) / 1000);
	    console.log('slot', slot, '|', rate.toFixed(1), 'slots/s |',
			inserted, 'withdrawals |', Math.round((target - slot) / rate / 60), 'min left');
	}

	// the chain moves on while we work; extend the target so one run
	// finishes fully caught up (unless a fixed target was given)
	if (slot > target && !cap)
	    target = await getFinalizedSlot();

	await sleep(delay);
    }

    const mins = ((Date.now() - t0) / 60000).toFixed(1);
    console.log('caught up to finalized slot', target, '-', inserted, 'withdrawals in', mins, 'minutes');
    await db.end();
})();
