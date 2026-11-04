import { Router } from 'express';
import { supabase } from '../db/database.js';
import { getOffre } from '../utils/offre.js';

const router = Router();

// GET /api/folders
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('offre', getOffre(req))
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/folders
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom du dossier requis' });

  try {
    const { data, error } = await supabase
      .from('folders')
      .insert({ name, offre: getOffre(req) })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Ce dossier existe déjà' });
      }
      throw error;
    }
    res.json(data);
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/folders/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Note: On ne supprime pas les feuilles associées, elles resteront avec le nom de catégorie actuel
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
