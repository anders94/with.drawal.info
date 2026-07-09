CREATE UNIQUE INDEX validators_idx ON public.validators USING btree (id);
CREATE INDEX withdrawals_amount_idx ON public.withdrawals USING btree (amount);
CREATE INDEX idx_prices_stamp ON public.prices USING btree (stamp);

DO $$ BEGIN
  EXECUTE format('ALTER DATABASE %I RESET random_page_cost', current_database());
END $$;
