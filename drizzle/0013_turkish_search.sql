-- Turkish-aware, accent-insensitive search: "uskudar" matches "Üsküdar",
-- "istanbul" matches "İSTANBUL". unaccent() is only STABLE, so it is wrapped
-- in an IMMUTABLE function (fixed dictionary, schema-qualified) that indexes
-- can use. İ / I / ı are folded to i first: lower('İ') is not 'i' outside a
-- Turkish locale and unaccent has no rule for 'ı'.
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.f_search_norm(value text)
RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
AS $$
  SELECT lower(public.unaccent('public.unaccent'::regdictionary, translate(value, 'İIı', 'iii')))
$$;--> statement-breakpoint
DROP INDEX "idx_pins_name_trgm";--> statement-breakpoint
DROP INDEX "idx_user_display_name_trgm";--> statement-breakpoint
CREATE INDEX "idx_pins_name_search_trgm" ON "pins" USING gin (f_search_norm("name") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_user_display_name_search_trgm" ON "user" USING gin (f_search_norm("display_name") gin_trgm_ops);