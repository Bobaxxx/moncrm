-- MonCRM - Schema de base de données
-- Prospects issus de Google Maps Scraper

CREATE TABLE IF NOT EXISTS import_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  total_lignes INTEGER DEFAULT 0,
  lignes_importees INTEGER DEFAULT 0,
  lignes_filtrees INTEGER DEFAULT 0,
  doublons_ignores INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prospects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom_entreprise TEXT NOT NULL,
  telephone TEXT NOT NULL,
  adresse TEXT,
  url_site TEXT,
  departement TEXT,
  source TEXT DEFAULT 'maps',
  statut TEXT DEFAULT 'a_contacter',
  import_id INTEGER,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (import_id) REFERENCES import_history(id)
);

CREATE INDEX IF NOT EXISTS idx_prospects_statut ON prospects(statut);
CREATE INDEX IF NOT EXISTS idx_prospects_telephone ON prospects(telephone);
CREATE INDEX IF NOT EXISTS idx_prospects_departement ON prospects(departement);

CREATE TABLE IF NOT EXISTS sms_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  contenu TEXT NOT NULL,
  actif BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4 templates SMS par défaut
INSERT OR IGNORE INTO sms_templates (id, nom, contenu) VALUES
(1, 'Template 1 - Découverte', 'Bonjour, je suis développeur web et j''ai remarqué que {nom_entreprise} n''a pas encore de site internet. Je crée des sites professionnels à partir de 499€. Intéressé(e) ? Je peux vous envoyer une maquette gratuite.'),
(2, 'Template 2 - Concurrence', 'Bonjour, vos concurrents à {departement} ont déjà un site web professionnel. Je peux créer le vôtre pour {nom_entreprise} rapidement et à petit prix. Voulez-vous voir un exemple ?'),
(3, 'Template 3 - Visibilité', 'Bonjour, saviez-vous que 80% des clients cherchent sur Google avant d''acheter ? {nom_entreprise} mérite d''être visible en ligne. Je crée votre site pro clé en main. Intéressé(e) ?'),
(4, 'Template 4 - Direct', 'Bonjour, je développe des sites web pour les entreprises locales. J''aimerais proposer mes services à {nom_entreprise}. Puis-je vous envoyer une maquette gratuite sans engagement ?');

CREATE TABLE IF NOT EXISTS planning_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titre TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'autre',        -- sms_session, appel, maquette, relance, rdv, autre
  date TEXT NOT NULL,                -- YYYY-MM-DD
  heure_debut TEXT,                  -- HH:MM
  heure_fin TEXT,                    -- HH:MM
  prospect_id INTEGER,              -- Lien optionnel vers un prospect
  completed BOOLEAN DEFAULT 0,
  couleur TEXT DEFAULT '#6366f1',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prospect_id) REFERENCES prospects(id)
);

CREATE INDEX IF NOT EXISTS idx_planning_date ON planning_tasks(date);
