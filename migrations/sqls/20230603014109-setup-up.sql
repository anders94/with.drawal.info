-- ----------------------------------------------------
-- Table: Config
--   Stores configuration values such as where we last
--   left off work.
-- ----------------------------------------------------
CREATE TABLE config (
       k            TEXT                           NOT NULL UNIQUE,
       v            TEXT                           NOT NULL
) WITH (OIDS=FALSE);

-- ----------------------------------------------------
-- Table: Validators
--   Lists validators we are monitoring
-- ----------------------------------------------------
CREATE TABLE validators (
       id           BIGINT                         NOT NULL UNIQUE,
       pubkey       TEXT                           NOT NULL
) WITH (OIDS=FALSE);
CREATE UNIQUE INDEX validators_id_idx ON validators (id);

-- ----------------------------------------------------
-- Table: Slots
--   Records slots including timestamps
-- ----------------------------------------------------
CREATE TABLE slots (
       id           BIGINT                         NOT NULL UNIQUE,
       stamp        TIMESTAMP WITH TIME ZONE       NOT NULL,
       CONSTRAINT pk_slots_id                      PRIMARY KEY (id)
) WITH (OIDS=FALSE);

-- ----------------------------------------------------
-- Table: Withdrawals
--   Records withdrawals that have been finalized
-- ----------------------------------------------------
CREATE TABLE withdrawals (
       id           BIGINT                         NOT NULL UNIQUE,
       slot_id      BIGINT                         NOT NULL REFERENCES slots(id),
       validator_id BIGINT                         NOT NULL REFERENCES validators(id),
       address      TEXT                           NOT NULL,
       amount       BIGINT                         NOT NULL,
       UNIQUE (slot_id, validator_id)
) WITH (OIDS=FALSE);
CREATE INDEX withdrawals_validator_id_idx ON withdrawals (validator_id);

-- ----------------------------------------------------
-- Table: Users
--   Stores users
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
       id                UUID                      NOT NULL UNIQUE DEFAULT gen_random_uuid(),
       created_at        TIMESTAMP WITH TIME ZONE  NOT NULL DEFAULT now(),
       updated_at        TIMESTAMP WITH TIME ZONE,
       obsolete          BOOLEAN                   NOT NULL DEFAULT FALSE,
       full_name         TEXT                      NOT NULL,
       email             TEXT                      NOT NULL UNIQUE,
       hashed_password   TEXT                      NOT NULL,
       attributes        JSONB                     NOT NULL DEFAULT '{}'::JSONB -- google profile, oauth secrets, etc.
);

-- ----------------------------------------------------
-- Table: Users to Validators
--   Associates users with validators
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS users2validators (
       user_id           UUID                      NOT NULL REFERENCES users(id),
       validator_id      BIGINT                    NOT NULL REFERENCES validators(id),
       UNIQUE (user_id, validator_id)
);
