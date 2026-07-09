/* Index cleanup and planner tuning.
 *
 * validators_idx is an exact duplicate of pk_validators_id (both UNIQUE btree
 * on validators.id); every constraint depends on pk_validators_id, so the
 * duplicate only adds write overhead (14 MB).
 *
 * withdrawals_amount_idx (179 MB) has no remaining user: the only query that
 * ordered by amount (utils/summaries.js "largest withdrawals") is commented
 * out. Every withdrawal insert was paying to maintain it.
 *
 * random_page_cost defaults to 4.0, tuned for spinning disks. On SSD storage
 * that estimate makes the planner avoid index probes into withdrawals and
 * seq-scan all ~8M rows instead: the epoch/homepage aggregations run ~15x
 * slower than the nested-loop plan the existing indexes support (measured
 * 858ms -> 56ms). Setting it per-database persists for all future connections.
 */

DROP INDEX IF EXISTS validators_idx;
DROP INDEX IF EXISTS withdrawals_amount_idx;

/* Backfill slots.price_id where NULL. The ingest (utils/update.js) does not
 * set price_id; only the offline summaries script backfilled it. The app's
 * queries prefer price_id and fall back to a nearest-stamp lookup, so full
 * coverage keeps every query on the cheap path. Uses two btree probes on
 * prices(stamp) per row rather than the old whole-table sort. */
UPDATE slots s SET price_id = (
  SELECT c.id FROM (
    (SELECT id, stamp FROM prices WHERE stamp <= s.stamp ORDER BY stamp DESC LIMIT 1)
    UNION ALL
    (SELECT id, stamp FROM prices WHERE stamp > s.stamp ORDER BY stamp ASC LIMIT 1)
  ) c ORDER BY ABS(EXTRACT(EPOCH FROM (c.stamp - s.stamp))) LIMIT 1)
WHERE s.price_id IS NULL;

DO $$ BEGIN
  EXECUTE format('ALTER DATABASE %I SET random_page_cost = 1.1', current_database());
END $$;
