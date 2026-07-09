const db = require('../db');

(async () => {
    const res = await db.query('SELECT id FROM validators ORDER BY id ASC');
    if (res.rows) {
	let counter = 0;
	let missing = 0;
	for (const row of res.rows) {
	    while (counter < row.id) {
		console.log('missing', counter);
		missing++;
		counter++;
	    }
	    counter++;

	}
	console.log('total missing:', missing, 'validators');

    }

    await db.end();
})();
