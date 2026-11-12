-- Marquer les prospects intéressants pour AppConduc (autre activité)
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS appconduc BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_prospects_appconduc ON prospects(appconduc) WHERE appconduc = true;
