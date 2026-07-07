-- Migration: Add statut_appel to prospects table
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS statut_appel TEXT DEFAULT 'a_appeler';
CREATE INDEX IF NOT EXISTS idx_prospects_statut_appel ON prospects(statut_appel);
