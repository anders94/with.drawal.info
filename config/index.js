module.exports = {
    postgres: {
	host: process.env.PGHOST || 'localhost',
	database: process.env.PGDATABASE || 'staking_dev',
	user: process.env.PGUSER || 'staking',
	password: process.env.PGPASSWORD || '',
	ssl: false,
	debug: false

    },
    ethrpc: {
	url: process.env.ETHRPCURL || 'http://127.0.0.1:8545'

    }

}
