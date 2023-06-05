module.exports = {
    postgres: {
	host: process.env.PGHOST || 'localhost',
	database: process.env.PGDATABASE || 'staking_dev',
	user: process.env.PGUSER || 'staking',
	password: process.env.PGPASSWORD || '',
	ssl: false,
	debug: false

    },

}
