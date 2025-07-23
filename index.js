const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const datefns = require('date-fns');
const routes = require('./routes');
const homepageCache = require('./cache');

const app = express();
const port = process.env.PORT ? process.env.PORT : 3000;
const host = process.env.HOST ? process.env.HOST : '0.0.0.0';
app.set('view engine', 'pug');
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

const http = require('http').createServer(app);

(async () => {
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
	const timestamp = new Date().toISOString();
	const method = req.method;
	const url = req.url;
	const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
	const userAgent = req.get('User-Agent') || 'Unknown';
	
	console.log(`[${timestamp}] ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent}`);
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
