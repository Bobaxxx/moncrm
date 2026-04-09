-- SCRIPT DE SÉCURISATION MAXIMALE DU CRM
-- Ce script active la RLS et bloque tout accès public.
-- Seuls les utilisateurs connectés ou le serveur backend peuvent accéder aux données.

-- 1. Nettoyage (optionnel, au cas où des politiques existeraient déjà)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON import_history;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON prospects;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON sms_templates;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON planning_tasks;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON activity_logs;

-- 2. Activation de la sécurité au niveau des lignes (RLS)
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 3. Création des politiques de sécurité strictes
-- Seuls les utilisateurs authentifiés via Supabase Auth peuvent agir sur les données.
-- Les accès anonymes (non connectés) sont strictement refusés.

-- Imports
CREATE POLICY "Auth access only" ON import_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Prospects
CREATE POLICY "Auth access only" ON prospects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SMS Templates
CREATE POLICY "Auth access only" ON sms_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Planning
CREATE POLICY "Auth access only" ON planning_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Journaux d'activité
CREATE POLICY "Auth access only" ON activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- NOTE : Le serveur backend (Node.js) utilise la clé 'service_role' 
-- et n'est pas limité par ces politiques. Cela protège contre les accès
-- directs via l'url du projet Supabase.
