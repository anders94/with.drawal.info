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
    app.get('/', routes.index);
    app.get('/validator/:id', routes.validator);

    http.listen(port, host, () => {
	console.log(`Listening on ${host}:${port}`)
    });
})();
