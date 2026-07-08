const { VERIFIED_TTL } = require('../routes/cap');

// User agents of well-known search-engine crawlers allowed through without a
// challenge, so the site stays indexable (it runs Google Analytics / cares about
// SEO). A UA string is spoofable, but the scrapers hammering the expensive SQL
// endpoints generally don't bother impersonating these. Remove this block if you
// want a hard gate on absolutely everything.
const CRAWLER_UA = /(googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|applebot|petalbot)/i;

// Global "checking your browser" gate. The first request in a session gets an
// invisible Cap.js proof-of-work interstitial; once solved, /cap/verify marks the
// session verified and every route passes for VERIFIED_TTL. Bots that don't run
// JS or don't keep cookies never get a verified session, so they never reach the
// expensive Postgres aggregations behind the page handlers.
module.exports = (req, res, next) => {
    // Kill switch: set BOTGATE_DISABLED=1 to bypass the gate entirely (e.g. if
    // the interstitial is broken and the site needs to be restored immediately).
    if (process.env.BOTGATE_DISABLED === '1') return next();

    // The Cap.js endpoints must stay open (the interstitial calls them), and the
    // JSON API is intentionally left open — it is served from the in-memory
    // homepage cache, so it is cheap and safe for programmatic clients. Static
    // asset prefixes are allowlisted too so a missing file returns a real 404
    // instead of falling through to the interstitial HTML (which would corrupt
    // script/WASM loads on the interstitial itself).
    if (req.path === '/cap' || req.path.startsWith('/cap/') ||
        req.path.startsWith('/api/') ||
        req.path.startsWith('/js/') || req.path.startsWith('/css/') ||
        req.path.startsWith('/img/') || req.path === '/favicon.ico') {
        return next();
    }

    // Let well-known search crawlers through to keep the site indexable.
    if (CRAWLER_UA.test(req.get('user-agent') || '')) return next();

    const verified = req.session.capVerified;
    if (verified && (Date.now() - verified) < VERIFIED_TTL) return next();

    // Not verified yet: serve the interstitial for the originally requested URL.
    // Restrict returnTo to a same-origin path to avoid an open-redirect via the
    // interstitial's client-side navigation.
    let returnTo = req.originalUrl;
    if (typeof returnTo !== 'string' || !returnTo.startsWith('/') || returnTo.startsWith('//')) {
        returnTo = '/';
    }
    return res.render('challenge', { returnTo, page: 'challenge' });
};
