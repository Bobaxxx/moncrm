-- Table des produits / prestations types
CREATE TABLE IF NOT EXISTS products (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  category TEXT DEFAULT 'service', -- 'service', 'produit', 'abonnement'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activation RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth access only" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insertion de quelques produits par défaut
INSERT INTO products (name, description, price, category) VALUES
('Création Site Vitrine', 'Site internet professionnel responsive (5 pages)', 499, 'service'),
('Abonnement Mensuel', 'Hébergement et maintenance standard', 89, 'abonnement'),
('Maintenance Premium', 'Support prioritaire et mises à jour régulières', 49, 'service'),
('Optimisation SEO', 'Audit et optimisation du référencement naturel', 250, 'service')
ON CONFLICT (id) DO NOTHING;
