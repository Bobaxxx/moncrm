-- Schema pour le module de facturation micro-entreprise

-- Type d'énumération pour le type de document
-- CREATE TYPE IF NOT EXISTS doc_type AS ENUM ('invoice', 'quote');
-- Type d'énumération pour le statut
-- CREATE TYPE IF NOT EXISTS billing_status AS ENUM ('a_envoyer', 'en_attente', 'payee', 'en_retard', 'devis_accepte', 'devis_refuse');

CREATE TABLE IF NOT EXISTS invoices (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  number TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL, -- 'invoice' or 'quote'
  status TEXT NOT NULL DEFAULT 'a_envoyer',
  prospect_id BIGINT REFERENCES prospects(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_address TEXT,
  client_siren TEXT,
  date_emission DATE NOT NULL DEFAULT CURRENT_DATE,
  date_echeance DATE,
  date_prestation DATE,
  total_ht DECIMAL(10, 2) NOT NULL DEFAULT 0,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  invoice_id BIGINT REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(type);
CREATE INDEX IF NOT EXISTS idx_invoices_prospect_id ON invoices(prospect_id);

-- Activation RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Politiques d'accès (Admin only via authenticated)
CREATE POLICY "Auth access only" ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth access only" ON invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
