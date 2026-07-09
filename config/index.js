module.exports = {
    postgres: {
	host: process.env.PGHOST || 'localhost',
	database: process.env.PGDATABASE || 'staking_dev',
	user: process.env.PGUSER || 'staking',
	password: process.env.PGPASSWORD || '',
	ssl: false,
	debug: false

    },
    // execution-layer JSON-RPC (Geth et al) — eth_*, web3_* methods
    ethrpc: {
	url: process.env.ETHRPCURL || 'http://127.0.0.1:8545'

    },
    // consensus-layer / beacon REST API (Prysm et al) — /eth/v1/beacon/* paths
    beacon: {
	url: process.env.BEACONURL || 'http://127.0.0.1:3500'

    }

}
