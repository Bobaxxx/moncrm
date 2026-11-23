-- =====================================================================
-- Migration : Niveau d'intérêt après appel (chaud / tiède / froid)
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- =====================================================================

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS interet TEXT;

ALTER TABLE prospects DROP CONSTRAINT IF EXISTS prospects_interet_check;
ALTER TABLE prospects ADD CONSTRAINT prospects_interet_check
  CHECK (interet IS NULL OR interet IN ('chaud', 'tiede', 'froid'));

CREATE INDEX IF NOT EXISTS idx_prospects_offre_interet ON prospects(offre, interet);
