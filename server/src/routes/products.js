import { Router } from 'express';
import { supabase } from '../db/database.js';

const router = Router();

// GET /api/products - Liste des produits
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/products - Créer un produit
router.post('/', async (req, res) => {
  const { name, description, price, category } = req.body;
  
  const { data, error } = await supabase
    .from('products')
    .insert({ name, description, price, category })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH /api/products/:id - Modifier un produit
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = { ...req.body, updated_at: new Date().toISOString() };
  
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/products/:id - Supprimer un produit
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
