const express = require('express');
const bodyParser = require('body-parser');
const routes = require('./routes');

const app = express();
const port = process.env.PORT ? process.env.PORT : 3000;
const host = process.env.HOST ? process.env.HOST : '0.0.0.0';
app.set('view engine', 'pug');
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

const http = require('http').createServer(app);

(async () => {
    app.get('/', async (req, res) => {
	const rows = await db.run('SELECT id, pubkey FROM validators ORDER BY id');
	res.render('index', {validators: rows});
    });

    app.get('/validator/:id', async (req, res) => {
	const val = await db.run('SELECT id, pubkey FROM validators WHERE id = ?', [req.params.id]);
	if (val.length > 0) {
	    const inc = await db.run(
		'SELECT ' +
		'  e.ts, i.epoch_id, ' +
		'  i.attestation_source_reward, ' +
		'  i.attestation_target_reward, ' +
		'  i.attestation_head_reward ' +
		'FROM income i ' +
		'  LEFT JOIN epochs e on i.epoch_id = e.id ' +
		'WHERE validator_id = ? ' +
		'ORDER BY epoch_id DESC',
		[req.params.id]);
	    res.render('validator', {validator: val[0], income: inc});
	}
	else
	    res.render('error', {message: 'Validator not in database'});
    });

    http.listen(port, host, () => {
	console.log(`Listening on ${host}:${port}`)
    });
})();
