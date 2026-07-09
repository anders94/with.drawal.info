const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool(config.postgres);

// SQL fragment: the price nearest in time to `stampExpr`. Used as the fallback
// when a slot has no price_id (rare — currently every slot has one). Two btree
// probes on prices(stamp) instead of the old scan-and-sort of the whole table,
// which cost ~3ms per row. `stampExpr` is always a code-supplied column
// reference like 's.stamp', never user input.
const nearestPrice = (stampExpr) =>
    `(SELECT c.price FROM (
        (SELECT price, stamp FROM prices WHERE stamp <= ${stampExpr} ORDER BY stamp DESC LIMIT 1)
        UNION ALL
        (SELECT price, stamp FROM prices WHERE stamp > ${stampExpr} ORDER BY stamp ASC LIMIT 1)
      ) c ORDER BY ABS(EXTRACT(EPOCH FROM (c.stamp - ${stampExpr}))) LIMIT 1)`;

module.exports = {
    query: (sql, params) => pool.query(sql, params),
    nearestPrice: nearestPrice,
    end: () => pool.end()
}
