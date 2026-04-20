-- Ajout des champs d'abonnement à la table prospects
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS contrat_type TEXT DEFAULT 'achat'; -- 'achat' ou 'abonnement'
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS has_maintenance BOOLEAN DEFAULT FALSE;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS montant_mensuel NUMERIC DEFAULT 0;
