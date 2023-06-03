-- ----------------------------------------------------
-- Table: Validators
--   Lists validators we are monitoring
-- ----------------------------------------------------
CREATE TABLE validators (
       id           BIGINT          NOT NULL UNIQUE,
       pubkey       TEXT            NOT NULL,
       CONSTRAINT pk_validators_id  PRIMARY KEY (id)
) WITH (OIDS=FALSE);

-- ----------------------------------------------------
-- Table: Epochs
--   Records epochs including timestamps and usd value
-- ----------------------------------------------------
CREATE TABLE epochs (
       id           BIGINT          NOT NULL UNIQUE,
       stamp        TIMESTAMP       NOT NULL,
       usd_value    NUMERIC(16,4),
       CONSTRAINT pk_epochs_id      PRIMARY KEY (id)
) WITH (OIDS=FALSE);

-- ----------------------------------------------------
-- Table: Withdrawals
--   Records withdrawals that have been finalized
-- ----------------------------------------------------
CREATE TABLE withdrawals (
       id           BIGINT          NOT NULL UNIQUE,
       epoch_id     BIGINT          NOT NULL REFERENCES epochs(id),
       validator_id BIGINT          NOT NULL REFERENCES validators(id),
       address      TEXT            NOT NULL,
       amount       BIGINT          NOT NULL,
       UNIQUE (epoch_id, validator_id)
) WITH (OIDS=FALSE);
