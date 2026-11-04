-- =====================================================================
-- Migration : Classement manuel des prospects (A / B / C)
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
--   A = à appeler en priorité, B = à appeler ensuite, C = ne pas appeler
-- =====================================================================

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS classement TEXT;

ALTER TABLE prospects DROP CONSTRAINT IF EXISTS prospects_classement_check;
ALTER TABLE prospects ADD CONSTRAINT prospects_classement_check
  CHECK (classement IS NULL OR classement IN ('A', 'B', 'C'));

CREATE INDEX IF NOT EXISTS idx_prospects_offre_classement ON prospects(offre, classement);
