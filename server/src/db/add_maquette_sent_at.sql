-- Migration: Add maquette_sent_at to prospects table
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS maquette_sent_at TIMESTAMPTZ;
