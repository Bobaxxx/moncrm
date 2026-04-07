import { Router } from 'express';
import { supabase } from '../db/database.js';

const router = Router();

// GET /api/planning?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', async (req, res) => {
  const { from, to, date } = req.query;

  let query = supabase
    .from('planning_tasks')
    .select(`
      *,
      prospects (
        nom_entreprise,
        telephone
      )
    `)
    .order('date', { ascending: true })
    .order('heure_debut', { ascending: true });

  if (date) {
    query = query.eq('date', date);
  } else if (from && to) {
    query = query.gte('date', from).lte('date', to);
  }

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });

  // On reformate pour garder la même structure que l'ancienne API (flat)
  const formattedData = data.map(t => ({
    ...t,
    prospect_nom: t.prospects?.nom_entreprise,
    prospect_tel: t.prospects?.telephone
  }));

  res.json(formattedData);
});

// POST /api/planning
router.post('/', async (req, res) => {
  const { titre, description, type, date, heure_debut, heure_fin, prospect_id, couleur } = req.body;

  if (!titre || !date) {
    return res.status(400).json({ error: 'Titre et date requis' });
  }

  const { data, error } = await supabase
    .from('planning_tasks')
    .insert({
      titre,
      description: description || '',
      type: type || 'autre',
      date,
      heure_debut: heure_debut || null,
      heure_fin: heure_fin || null,
      prospect_id: prospect_id || null,
      couleur: couleur || '#6366f1'
    })
    .select(`
      *,
      prospects (
        nom_entreprise,
        telephone
      )
    `)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ...data, prospect_nom: data.prospects?.nom_entreprise, prospect_tel: data.prospects?.telephone });
});

// PATCH /api/planning/:id
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = { ...req.body };

  const { data, error } = await supabase
    .from('planning_tasks')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      prospects (
        nom_entreprise,
        telephone
      )
    `)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ...data, prospect_nom: data.prospects?.nom_entreprise, prospect_tel: data.prospects?.telephone });
});

// DELETE /api/planning/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('planning_tasks').delete().eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
