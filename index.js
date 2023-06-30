const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const datefns = require('date-fns');
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
    app.use(session({
	cookie: { maxAge: 10 * 86400000 },
	store: new MemoryStore({ checkPeriod: 86400000 }),
	resave: false,
	saveUninitialized: false,
	secret: process.env.SESSIONSECRET || 'd46e4e10115103fa32780d259d0705e4'
    }));

    app.use((req, res, next) => {
	res.locals.datefns = datefns;
	res.locals.session = req.session;
	next();
    });

    app.use('/', routes);

    http.listen(port, host, () => {
	console.log(`Listening on ${host}:${port}`)
    });
})();
