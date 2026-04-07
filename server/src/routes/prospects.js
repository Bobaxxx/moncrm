import { Router } from 'express';
import { supabase } from '../db/database.js';

const router = Router();

// GET /api/prospects - Liste avec filtres
router.get('/', async (req, res) => {
  const { search, statut, departement, source } = req.query;

  let query = supabase.from('prospects').select('*').order('created_at', { ascending: false });

  if (search) {
    query = query.or(`nom_entreprise.ilike.%${search}%,telephone.ilike.%${search}%`);
  }
  if (statut) {
    query = query.eq('statut', statut);
  }
  if (departement) {
    query = query.eq('departement', departement);
  }
  if (source) {
    query = query.eq('source', source);
  }
  if (req.query.import_id) {
    query = query.eq('import_id', req.query.import_id);
  }

  const { data, error } = await query
    .order('id', { ascending: true }) // TOUJOURS TRIER PAR ID POUR GARDER L'ORDRE ORIGINAL
    .limit(100);


  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/prospects/stats - Statistiques globales
router.get('/stats', async (req, res) => {
  try {
    const { data: prospects, error } = await supabase.from('prospects').select('statut, source, departement');
    if (error) throw error;

    const stats = {
      total: prospects.length,
      byStatut: [],
      bySource: [],
      byDepartement: []
    };

    // Grouping logic in JS as Supabase simple select is easier here
    const statusMap = {};
    const sourceMap = {};
    const deptMap = {};

    prospects.forEach(p => {
      statusMap[p.statut] = (statusMap[p.statut] || 0) + 1;
      sourceMap[p.source] = (sourceMap[p.source] || 0) + 1;
      if (p.departement) deptMap[p.departement] = (deptMap[p.departement] || 0) + 1;
    });

    stats.byStatut = Object.entries(statusMap).map(([statut, count]) => ({ statut, count }));
    stats.bySource = Object.entries(sourceMap).map(([source, count]) => ({ source, count }));
    stats.byDepartement = Object.entries(deptMap)
      .map(([departement, count]) => ({ departement, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/prospects/kanban - Groupé par statut
router.get('/kanban', async (req, res) => {
  try {
    const { data, error } = await supabase.from('prospects').select('*').order('updated_at', { ascending: false });
    if (error) throw error;

    const columns = {
      a_contacter: [],
      sms_envoye: [],
      maquette_demande: [],
      maquette_envoye: [],
      relance_appel: [],
      client_signe: []
    };

    data.forEach(p => {
      if (columns[p.statut]) {
        columns[p.statut].push(p);
      }
    });

    res.json(columns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/prospects/:id - Mise à jour (ex: changement de statut)
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = { ...req.body, updated_at: new Date().toISOString() };

  const { data, error } = await supabase
    .from('prospects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/prospects/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('prospects').delete().eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
