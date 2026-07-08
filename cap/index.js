const Cap = require('@cap.js/server');

// In-memory storage for Cap challenges and issued tokens. Supplying both the
// `challenges` and `tokens` storage hooks makes @cap.js/server bypass its
// default filesystem state entirely (see node_modules/@cap.js/server/index.js),
// which matches this app's single-process, no-persistence style (the homepage
// cache and session store are in-memory too). Challenges and tokens are
// short-lived, so losing them on restart is harmless.
const challenges = new Map(); // token -> { challenge, expires }
const tokens = new Map();     // tokenKey -> expires (ms epoch)

const cap = new Cap({
    noFSState: true,
    storage: {
        challenges: {
            store: async (token, data) => { challenges.set(token, data); },
            read: async (token) => challenges.get(token) || null,
            delete: async (token) => { challenges.delete(token); },
            deleteExpired: async () => {
                const now = Date.now();
                for (const [token, data] of challenges) {
                    if (data.expires && data.expires < now) challenges.delete(token);
                }
            }
        },
        tokens: {
            store: async (key, expires) => { tokens.set(key, expires); },
            get: async (key) => tokens.get(key) || null,
            delete: async (key) => { tokens.delete(key); },
            deleteExpired: async () => {
                const now = Date.now();
                for (const [key, expires] of tokens) {
                    if (expires && expires < now) tokens.delete(key);
                }
            }
        }
    }
});

module.exports = cap;
