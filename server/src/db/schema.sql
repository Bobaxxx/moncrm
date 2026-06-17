-- MonCRM - Schema de base de données PostgreSQL (Supabase)
-- Prospects issus de Google Maps Scraper

CREATE TABLE IF NOT EXISTS import_history (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  filename TEXT NOT NULL,
  total_lignes INTEGER DEFAULT 0,
  lignes_importees INTEGER DEFAULT 0,
  lignes_filtrees INTEGER DEFAULT 0,
  doublons_ignores INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  category TEXT DEFAULT 'Serrurier',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prospects (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nom_entreprise TEXT NOT NULL,
  telephone TEXT NOT NULL,
  adresse TEXT,
  url_site TEXT,
  departement TEXT,
  source TEXT DEFAULT 'maps',
  statut TEXT DEFAULT 'a_contacter',
  import_id BIGINT,
  notes TEXT,
  maquette_phone TEXT,
  siren TEXT,
  sms_sent_at TIMESTAMPTZ,
  maquette_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_import FOREIGN KEY (import_id) REFERENCES import_history(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_prospects_statut ON prospects(statut);
CREATE INDEX IF NOT EXISTS idx_prospects_telephone ON prospects(telephone);
CREATE INDEX IF NOT EXISTS idx_prospects_departement ON prospects(departement);

CREATE TABLE IF NOT EXISTS sms_templates (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nom TEXT NOT NULL,
  contenu TEXT NOT NULL,
  actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4 templates SMS par défaut
INSERT INTO sms_templates (id, nom, contenu) VALUES
(1, 'Template 1 - Découverte', 'Bonjour, je suis développeur web et j''ai remarqué que {nom_entreprise} n''a pas encore de site internet. Je crée des sites professionnels à partir de 499€. Intéressé(e) ? Je peux vous envoyer une maquette gratuite.'),
(2, 'Template 2 - Concurrence', 'Bonjour, vos concurrents à {departement} ont déjà un site web professionnel. Je peux créer le vôtre pour {nom_entreprise} rapidement et à petit prix. Voulez-vous voir un exemple ?'),
(3, 'Template 3 - Visibilité', 'Bonjour, saviez-vous que 80% des clients cherchent sur Google avant d''acheter ? {nom_entreprise} mérite d''être visible en ligne. Je crée votre site pro clé en main. Intéressé(e) ?'),
(4, 'Template 4 - Direct', 'Bonjour, je développe des sites web pour les entreprises locales. J''aimerais proposer mes services à {nom_entreprise}. Puis-je vous envoyer une maquette gratuite sans engagement ?')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS planning_tasks (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  titre TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'autre',        -- sms_session, appel, maquette, relance, rdv, autre
  date TEXT NOT NULL,                -- YYYY-MM-DD
  heure_debut TEXT,                  -- HH:MM
  heure_fin TEXT,                    -- HH:MM
  prospect_id BIGINT,                -- Lien optionnel vers un prospect
  completed BOOLEAN DEFAULT FALSE,
  couleur TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_prospect FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_planning_date ON planning_tasks(date);

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  prospect_id BIGINT REFERENCES prospects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les journaux d'activité
CREATE INDEX IF NOT EXISTS idx_activity_prospect ON activity_logs(prospect_id);
CREATE INDEX IF NOT EXISTS idx_activity_date ON activity_logs(created_at);

-- ==========================================
-- SÉCURITÉ (Row Level Security)
-- ==========================================

-- 1. Activation de la RLS pour toutes les tables
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 2. Politiques d'accès restrictives
-- Bloque tout accès public (anon).
-- Autorise uniquement les utilisateurs authentifiés.

CREATE POLICY "Auth access only" ON import_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth access only" ON prospects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth access only" ON sms_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth access only" ON planning_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth access only" ON activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
