-- =====================================================================
-- Migration : Enrichissement automatique des téléphones (Google Places)
-- À exécuter UNE FOIS dans Supabase > SQL Editor (après saas_migration.sql).
-- =====================================================================

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
-- found | not_found | ambiguous | duplicate_phone | error
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS enrichment_status TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;

-- Accélère la recherche des leads SaaS sans téléphone à enrichir
CREATE INDEX IF NOT EXISTS idx_prospects_enrichment
  ON prospects(offre, enrichment_status)
  WHERE telephone IS NULL;
