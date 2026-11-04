-- =====================================================================
-- Migration : Espace SaaS (PlanniBat)
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- Toutes les données existantes sont rattachées à l'espace 'site_web'.
-- =====================================================================

-- 1. Espace de travail sur les prospects
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS offre TEXT NOT NULL DEFAULT 'site_web';
CREATE INDEX IF NOT EXISTS idx_prospects_offre ON prospects(offre);
CREATE INDEX IF NOT EXISTS idx_prospects_offre_statut ON prospects(offre, statut);

-- 2. Champs B2B (Pappers / Annuaire des Entreprises)
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS ville TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS code_postal TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS activite TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS code_naf TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS effectif TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS dirigeant TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS url_fiche TEXT;      -- Fiche Pappers / Annuaire
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS raison_perte TEXT;   -- Raison du refus (statut 'perdu')
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS siren TEXT;

-- 3. Téléphone facultatif (on peut n'avoir qu'une adresse ou une fiche Pappers)
ALTER TABLE prospects ALTER COLUMN telephone DROP NOT NULL;
UPDATE prospects SET telephone = NULL WHERE telephone = '';

-- 4. Unicité du téléphone PAR espace (au lieu de globale)
--    On supprime toute contrainte / index unique portant uniquement sur "telephone".
DO $$
DECLARE
  r RECORD;
  tel_attnum SMALLINT;
BEGIN
  SELECT attnum INTO tel_attnum
  FROM pg_attribute
  WHERE attrelid = 'prospects'::regclass AND attname = 'telephone';

  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'prospects'::regclass
      AND contype = 'u'
      AND conkey = ARRAY[tel_attnum]
  LOOP
    EXECUTE format('ALTER TABLE prospects DROP CONSTRAINT %I', r.conname);
  END LOOP;

  FOR r IN
    SELECT c.relname AS idxname
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indexrelid
    WHERE i.indrelid = 'prospects'::regclass
      AND i.indisunique
      AND NOT i.indisprimary
      AND i.indkey::text = tel_attnum::text
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', r.idxname);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS prospects_telephone_offre_key ON prospects(telephone, offre);
CREATE INDEX IF NOT EXISTS idx_prospects_siren ON prospects(siren);

-- 5. Feuilles d'import et dossiers par espace
ALTER TABLE import_history ADD COLUMN IF NOT EXISTS offre TEXT NOT NULL DEFAULT 'site_web';
CREATE INDEX IF NOT EXISTS idx_import_history_offre ON import_history(offre);

ALTER TABLE folders ADD COLUMN IF NOT EXISTS offre TEXT NOT NULL DEFAULT 'site_web';
ALTER TABLE folders DROP CONSTRAINT IF EXISTS folders_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS folders_name_offre_key ON folders(name, offre);
INSERT INTO folders (name, offre) VALUES ('BTP', 'saas') ON CONFLICT DO NOTHING;

-- 6. Templates SMS par espace
ALTER TABLE sms_templates ADD COLUMN IF NOT EXISTS offre TEXT NOT NULL DEFAULT 'site_web';

INSERT INTO sms_templates (nom, contenu, offre)
SELECT v.nom, v.contenu, 'saas'
FROM (VALUES
  ('PlanniBat - Après passage au dépôt',
   'Bonjour {dirigeant}, je suis passé à votre dépôt ce matin. Comme promis : PlanniBat organise le planning de vos chantiers et prévient vos équipes par SMS chaque soir. Je vous montre en 5 min ?'),
  ('PlanniBat - Premier contact',
   'Bonjour {dirigeant}, je développe PlanniBat, un planning chantier simple pour les entreprises du bâtiment de {ville} : vos gars reçoivent leur affectation du lendemain par SMS. Ça vous intéresse d''en voir une démo ?')
) AS v(nom, contenu)
WHERE NOT EXISTS (SELECT 1 FROM sms_templates WHERE offre = 'saas');
