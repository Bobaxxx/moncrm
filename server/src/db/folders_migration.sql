-- Migration: Création de la table folders pour organiser les feuilles d'import
CREATE TABLE IF NOT EXISTS folders (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insérer les catégories existantes depuis import_history pour ne rien perdre
INSERT INTO folders (name)
SELECT DISTINCT category FROM import_history
WHERE category IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- S'assurer qu'il y a au moins 'Serrurier' par défaut
INSERT INTO folders (name) VALUES ('Serrurier') ON CONFLICT (name) DO NOTHING;

-- SÉCURITÉ
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth access only" ON folders FOR ALL TO authenticated USING (true) WITH CHECK (true);
