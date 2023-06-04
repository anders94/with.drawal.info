-- ----------------------------------------------------
-- Table: Prices
--   Prices in USD at given timestamps
-- ----------------------------------------------------
CREATE TABLE prices (
       stamp        TIMESTAMP       NOT NULL UNIQUE,
       price        NUMERIC(16, 8)  NOT NULL
) WITH (OIDS=FALSE);
