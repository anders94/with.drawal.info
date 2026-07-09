const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const datefns = require('date-fns');
const axios = require('axios');
const config = require('./config');
const routes = require('./routes');
const botGate = require('./middleware/botGate');
const homepageCache = require('./cache');
const priceUpdater = require('./priceUpdater');

// Log reachability of the Ethereum endpoints at startup so a misconfigured
// ETHRPCURL / BEACONURL is visible in the logs. Informational only — the web
// serving path does not depend on either, so failures don't block startup.
const checkEthEndpoints = async () => {
    try {
	const res = await axios.post(config.ethrpc.url,
	    { jsonrpc: '2.0', method: 'web3_clientVersion', params: [], id: 1 },
	    { timeout: 5000 });
	console.log(`ethrpc OK ${config.ethrpc.url} (${res.data.result})`);
    }
    catch (e) {
	console.log(`ethrpc FAILED ${config.ethrpc.url} (${e.message})`);
    }
    try {
	const res = await axios.get(config.beacon.url + '/eth/v1/node/version', { timeout: 5000 });
	console.log(`beacon OK ${config.beacon.url} (${res.data.data.version})`);
    }
    catch (e) {
	console.log(`beacon FAILED ${config.beacon.url} (${e.message})`);
    }
};

const app = express();
const port = process.env.PORT ? process.env.PORT : 3000;
const host = process.env.HOST ? process.env.HOST : '0.0.0.0';
app.set('view engine', 'pug');
// Cache compiled Pug templates instead of recompiling from disk on every
// request. Express only enables this automatically when NODE_ENV=production;
// enabling it explicitly cuts render time from ~7ms to ~0.1ms (it matters most
// on the bot-gate interstitial, which is rendered for every un-verified hit).
// Disable via NODE_ENV=development if you want template hot-reload while editing.
if (process.env.NODE_ENV !== 'development') app.set('view cache', true);
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

const http = require('http').createServer(app);

(async () => {
    checkEthEndpoints(); // async, logs results; doesn't block startup

    // Initialize homepage cache before starting server
    await homepageCache.initialize();

    app.use(session({
	cookie: { maxAge: 10 * 86400000 },
	store: new MemoryStore({ checkPeriod: 86400000 }),
	resave: false,
	saveUninitialized: false,
	secret: process.env.SESSIONSECRET || 'd46e4e10115103fa32780d259d0705e4'
    }));

    // Request logging middleware
    app.use((req, res, next) => {
	const ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
	const method = req.method;
	const url = req.url;
	const start = process.hrtime.bigint();

	res.on('finish', () => {
	    const ms = Number(process.hrtime.bigint() - start) / 1e6;
	    console.log(`${ip} ${method} ${url} ${ms.toFixed(1)}ms`);
	});
	next();
    });

    // Middleware to block requests until cache is ready
    app.use((req, res, next) => {
	if (req.path === '/' && !homepageCache.isReady()) {
	    return res.status(503).send('Server is starting up, please wait...');
	}
	next();
    });

    app.use((req, res, next) => {
	res.locals.datefns = datefns;
	res.locals.session = req.session;
	res.locals.homepageCache = homepageCache;
	next();
    });

    // Challenge un-verified visitors with a proof-of-work interstitial before
    // they can reach the (expensive) page handlers. Runs after session (needs
    // req.session) and after express.static (assets are served earlier and
    // never reach here).
    app.use(botGate);

    app.use('/', routes);

    // Graceful shutdown
    process.on('SIGTERM', () => {
	console.log('Received SIGTERM, shutting down gracefully');
	homepageCache.destroy();
	process.exit(0);
    });

    process.on('SIGINT', () => {
	console.log('Received SIGINT, shutting down gracefully');
	homepageCache.destroy();
	process.exit(0);
    });

    http.listen(port, host, () => {
	console.log(`Listening on ${host}:${port}`)
    });
})();

// periodically record spot price
/*
setInterval(async () => {
    await priceUpdater.spot();

}, 60 * 1000);
*/
