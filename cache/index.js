const db = require('../db');

class HomepageCache {
    constructor() {
        this.cache = {
            withdrawalsPerEpoch: [],
            latestWithdrawals: [],
            largestWithdrawals: [],
            epochsData: [],
            lastUpdated: null,
            isReady: false
        };
        this.refreshInterval = null;
    }

    async initialize() {
        console.log('Initializing homepage cache...');
        await this.refreshCache();
        
        // Set up automatic refresh every minute (60000ms)
        this.refreshInterval = setInterval(() => {
            this.refreshCache().catch(console.error);
        }, 60000);
        
        console.log('Homepage cache initialized and will refresh every minute');
    }

    async refreshCache() {
        try {
            console.log('Refreshing homepage cache...');
            
            // Execute all four queries in parallel for better performance
            const [perEpochResult, latestResult, largestResult, epochsResult] = await Promise.all([
                // perEpoch query
                db.query(
                    `WITH slot_prices AS (
                       SELECT
                         s.id AS slot_id,
                         COALESCE(p.price, (SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, s.stamp))) LIMIT 1)) AS price
                       FROM
                         slots s
                           LEFT JOIN prices p ON s.price_id = p.id
                       ORDER BY slot_id DESC
                       LIMIT 2048
                     )
                     SELECT
                       COUNT(sp.slot_id) AS slots,
                       (sp.slot_id / 32) AS epoch,
                       SUM(w.amount / 1000000000.0) AS eth_amount,
                       SUM(w.amount * sp.price / 1000000000.0) AS usd_amount
                     FROM
                       slot_prices sp
                         LEFT JOIN withdrawals w ON w.slot_id = sp.slot_id
                     GROUP BY epoch
                     ORDER BY epoch DESC
                     LIMIT 20`
                ),
                
                // latest query
                db.query(
                    `SELECT
                       s.stamp, w.id, v.id AS validator_id, w.slot_id, w.address, w.amount / 1000000000.0 AS eth_amount,
                       SUM((SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, s.stamp))) LIMIT 1) * (w.amount / 1000000000.0)) AS usd_amount
                     FROM
                       withdrawals w
                         LEFT JOIN slots s ON w.slot_id = s.id
                         LEFT JOIN validators v ON w.validator_id = v.id
                     GROUP BY
                       s.stamp, v.id, w.id, w.slot_id, w.address, w.amount
                     ORDER BY
                        w.slot_id DESC
                     LIMIT 27`
                ),
                
                // largest query
                db.query(
                    `SELECT *
                     FROM summaries
                     WHERE summary = $1
                     ORDER BY ordinal ASC
                     LIMIT 25`, 
                    ['largest-withdrawals-by-epoch']
                ),
                
                // epochs API query
                db.query(
                    `WITH slot_prices AS (
                       SELECT
                         s.id AS slot_id,
                         COALESCE(p.price, (SELECT price FROM prices ORDER BY ABS(EXTRACT(EPOCH FROM AGE(stamp, s.stamp))) LIMIT 1)) AS price
                       FROM
                         slots s
                           LEFT JOIN prices p ON s.price_id = p.id
                       ORDER BY slot_id DESC
                       LIMIT 4096
                     )
                     SELECT
                       (sp.slot_id / 32) AS epoch,
                       SUM(w.amount * sp.price / 1000000000.0) AS usd_amount
                     FROM
                       slot_prices sp
                         LEFT JOIN withdrawals w ON w.slot_id = sp.slot_id
                     GROUP BY epoch
                     ORDER BY epoch DESC
                     LIMIT 500`
                )
            ]);

            // Process epochs data (remove last element which is probably incomplete)
            const epochsData = epochsResult.rows.slice(); // Create a copy
            epochsData.pop(); // remove last element which is probably an incomplete epoch

            // Update cache with new data
            this.cache = {
                withdrawalsPerEpoch: perEpochResult.rows,
                latestWithdrawals: latestResult.rows,
                largestWithdrawals: largestResult.rows,
                epochsData: epochsData,
                lastUpdated: new Date(),
                isReady: true
            };
            
            console.log(`Homepage cache refreshed at ${this.cache.lastUpdated.toISOString()}`);
        } catch (error) {
            console.error('Error refreshing homepage cache:', error);
            // Don't mark as not ready if this is just a refresh error
            // Keep serving stale data rather than failing
        }
    }

    getCachedData() {
        return {
            withdrawalsPerEpoch: this.cache.withdrawalsPerEpoch,
            latestWithdrawals: this.cache.latestWithdrawals,
            largestWithdrawals: this.cache.largestWithdrawals
        };
    }

    getEpochsData() {
        return this.cache.epochsData;
    }

    isReady() {
        return this.cache.isReady;
    }

    getLastUpdated() {
        return this.cache.lastUpdated;
    }

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// Export singleton instance
module.exports = new HomepageCache();