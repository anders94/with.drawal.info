const cap = require('../../cap');

// Verified sessions are re-challenged after this long (ms).
const VERIFIED_TTL = 12 * 60 * 60 * 1000; // 12 hours

module.exports = {
    // The @cap.js/widget posts to `${apiEndpoint}challenge` and
    // `${apiEndpoint}redeem`; apiEndpoint is "/cap/".
    challenge: async (req, res) => {
        try {
            res.json(await cap.createChallenge());
        }
        catch (e) {
            console.log(e);
            res.status(500).json({ error: 'challenge_failed' });
        }
    },

    redeem: async (req, res) => {
        try {
            const { token, solutions } = req.body || {};
            res.json(await cap.redeemChallenge({ token, solutions }));
        }
        catch (e) {
            console.log(e);
            res.status(500).json({ success: false, error: 'redeem_failed' });
        }
    },

    // Called by the interstitial once the widget has solved the challenge.
    // Validates the redeemed token and, on success, marks the session as
    // human-verified so the botGate lets it through.
    verify: async (req, res) => {
        try {
            const { token } = req.body || {};
            if (!token) return res.status(400).json({ ok: false });

            const { success } = await cap.validateToken(token);
            if (!success) return res.status(403).json({ ok: false });

            req.session.capVerified = Date.now();
            return res.json({ ok: true });
        }
        catch (e) {
            console.log(e);
            res.status(500).json({ ok: false });
        }
    },

    VERIFIED_TTL
};
