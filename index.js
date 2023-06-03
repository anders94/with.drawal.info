const axios = require('axios');
const util = require('util');

(async () => {
    const res = await axios.get('http://127.0.0.1:3500/eth/v2/beacon/blocks/6553818');

    const withdrawals = res.data.data.message.body.execution_payload.withdrawals;
    for (const withdrawal of withdrawals) {
	console.log(withdrawal);
    }

})();
