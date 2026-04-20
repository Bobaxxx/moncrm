import { Router } from 'express';
import { supabase } from '../db/database.js';

const router = Router();

// GET /api/prospects - Liste avec filtres
router.get('/', async (req, res) => {
  const { search, statut, departement, source } = req.query;
  console.log('GET /api/prospects - Filters:', { search, statut, departement, source });

  let query = supabase.from('prospects').select('*').order('created_at', { ascending: false });

  if (search) {
    query = query.or(`nom_entreprise.ilike.%${search}%,telephone.ilike.%${search}%`);
  }
  if (statut) {
    query = query.ilike('statut', statut);
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
    .limit(500);


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

    // Ajout des stats SMS quotidiennes
    const today = new Date().toISOString().split('T')[0];
    const { count: smsToday } = await supabase
      .from('prospects')
      .select('*', { count: 'exact', head: true })
      .gte('sms_sent_at', `${today}T00:00:00`)
      .lte('sms_sent_at', `${today}T23:59:59`);
    
    stats.smsToday = smsToday || 0;

    // Ajout des stats Maquettes quotidiennes
    const { count: maquettesToday } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'status_change')
      .eq('new_value', 'maquette_envoyee')
      .gte('created_at', `${today}T00:00:00.000Z`);
    
    stats.maquettesToday = maquettesToday || 0;

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const logActivity = async (prospectId, eventType, oldValue, newValue) => {
  try {
    await supabase.from('activity_logs').insert({
      prospect_id: prospectId,
      event_type: eventType,
      old_value: oldValue,
      new_value: newValue
    });
  } catch (err) {
    console.error('Activity log error:', err);
  }
};

// POST /api/prospects - Création manuelle
router.post('/', async (req, res) => {
  const { nom_entreprise, telephone, adresse, url_site, departement, statut, maquette_phone } = req.body;
  
  if (!nom_entreprise || !telephone) {
    return res.status(400).json({ error: 'Nom et téléphone obligatoires' });
  }

  try {
    const { data, error } = await supabase
      .from('prospects')
      .insert({
        nom_entreprise,
        telephone,
        adresse,
        url_site,
        departement,
        statut: statut || 'a_contacter',
        maquette_phone,
        source: 'manuel'
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/prospects/bulk-update - Mise à jour massive (utilisé pour le drag-fill)
router.post('/bulk-update', async (req, res) => {
  const { ids, updates } = req.body;
  
  if (!ids || !ids.length) return res.status(400).json({ error: 'IDs manquants' });

  try {
    // 1. Récupérer les anciennes valeurs pour l'historique
    const { data: oldData } = await supabase
      .from('prospects')
      .select('id, statut')
      .in('id', ids);

    const finalUpdates = { ...updates, updated_at: new Date().toISOString() };
    
    // Si on marque comme SMS envoyé, on ajoute le timestamp
    if (updates.statut === 'sms_envoye') {
      finalUpdates.sms_sent_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('prospects')
      .update(finalUpdates)
      .in('id', ids)
      .select();

    if (error) throw error;

    // 2. Logger les changements si le statut a été modifié
    if (updates.statut && oldData) {
      const logPromises = oldData.map(p => {
        if (p.statut !== updates.statut) {
          return logActivity(p.id, 'status_change', p.statut, updates.statut);
        }
        return Promise.resolve();
      });
      await Promise.all(logPromises);
    }

    res.json(data);
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
      maquette_demandee: [],
      maquette_envoyee: [],
      a_relancer: [],
      interese: [],
      pas_de_budget: [],
      client_signe: []
    };

    data.forEach(p => {
      const status = p.statut || 'a_contacter';
      if (columns[status]) {
        columns[status].push(p);
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
  
  try {
    // 1. Récupérer l'ancien statut pour l'historique
    const { data: oldProspect } = await supabase
      .from('prospects')
      .select('statut')
      .eq('id', id)
      .single();

    const updates = { ...req.body, updated_at: new Date().toISOString() };
    
    // Si on passe au statut SMS envoyé, on date l'envoi
    if (req.body.statut === 'sms_envoye') {
      updates.sms_sent_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('prospects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // 2. Logger le changement de statut
    if (req.body.statut && oldProspect && oldProspect.statut !== req.body.statut) {
      await logActivity(id, 'status_change', oldProspect.statut, req.body.statut);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/prospects/:id - Détails d'un prospect
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/prospects/:id - Supprimer un prospect
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('prospects')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/prospects - Suppression groupée
router.delete('/', async (req, res) => {
  const { ids } = req.body;
  
  if (!ids || !ids.length) {
    return res.status(400).json({ error: 'IDs manquants' });
  }

  try {
    const { error } = await supabase
      .from('prospects')
      .delete()
      .in('id', ids);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
