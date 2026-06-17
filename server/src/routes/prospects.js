import { Router } from 'express';
import { supabase } from '../db/database.js';

const router = Router();

// GET /api/prospects - Liste avec filtres et pagination
router.get('/', async (req, res) => {
  const { search, statut, departement, source, category, page, limit, nopagination, import_id } = req.query;
  console.log('GET /api/prospects - Filters:', { search, statut, departement, source, category, page, limit, nopagination, import_id });

  let query;
  
  if (category) {
    // On doit utiliser select avec !inner pour filtrer par catégorie jointe
    query = supabase.from('prospects').select('*, import_history!inner(category)', { count: 'exact' })
                 .eq('import_history.category', category);
  } else {
    // Inclure les infos d'import dans tous les cas
    query = supabase.from('prospects').select('*, import_history(category)', { count: 'exact' });
  }

  // Appliquer les filtres
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
  if (import_id) {
    query = query.eq('import_id', import_id);
  }

  // Tri par défaut : plus récents d'abord (par date de création), 
  // avec l'ID en second critère pour garantir un ordre stable et cohérent.
  // Utilisation de created_at DESC pour le général, mais ID ASC pour la stabilité au sein d'un import.
  query = query.order('created_at', { ascending: false }).order('id', { ascending: false });

  try {
    if (nopagination === 'true') {
      // Pour certains cas (export, dashboard clients signés), on peut vouloir tout charger
      // Mais on limite quand même à un maximum raisonnable pour éviter de tuer le serveur
      let allData = [];
      let from = 0;
      const PAGE_SIZE = 1000;
      let hasMore = true;
      const MAX_TOTAL = 10000;

      while (hasMore && allData.length < MAX_TOTAL) {
        const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        allData = [...allData, ...data];
        if (data.length < PAGE_SIZE) hasMore = false;
        else from += PAGE_SIZE;
      }
      return res.json({ data: allData, total: allData.length, page: 1, limit: allData.length });
    }

    // Pagination standard
    const p = parseInt(page) || 1;
    const l = parseInt(limit) || 100;
    const from = (p - 1) * l;
    const to = from + l - 1;

    const { data, error, count } = await query.range(from, to);

    if (error) throw error;

    res.json({
      data: data || [],
      total: count || 0,
      page: p,
      limit: l,
      hasMore: (count || 0) > (from + (data?.length || 0))
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
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

    // Ajout des stats SMS totales (basées sur l'historique pour ne pas baisser)
    const { count: smsTotal } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'status_change')
      .eq('new_value', 'sms_envoye');
    
    stats.smsTotal = smsTotal || 0;

    // Ajout des stats Maquettes quotidiennes
    const { count: maquettesToday } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'status_change')
      .eq('new_value', 'maquette_envoyee')
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);
    
    stats.maquettesToday = maquettesToday || 0;

    // Ajout des stats Maquettes totales
    const { count: maquettesTotal } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'status_change')
      .eq('new_value', 'maquette_envoyee');
    
    stats.maquettesTotal = maquettesTotal || 0;

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

    // Si on marque comme maquette envoyée, on ajoute le timestamp
    if (updates.statut === 'maquette_envoyee') {
      finalUpdates.maquette_sent_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('prospects')
      .update(finalUpdates)
      .in('id', ids)
      .select();

    if (error) throw error;

    // 2. Logger les changements si le statut a été modifié
    if (updates.statut && oldData) {
      const logsToInsert = oldData
        .filter(p => p.statut !== updates.statut)
        .map(p => ({
          prospect_id: p.id,
          event_type: 'status_change',
          old_value: p.statut,
          new_value: updates.statut
        }));

      if (logsToInsert.length > 0) {
        const { error: logError } = await supabase.from('activity_logs').insert(logsToInsert);
        if (logError) console.error('Bulk activity log error:', logError);
      }
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/prospects/kanban - Groupé par statut
router.get('/kanban', async (req, res) => {
  try {
    let allData = [];
    let from = 0;
    const PAGE_SIZE = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .order('updated_at', { ascending: false })
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      allData = [...allData, ...data];
      
      if (data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        from += PAGE_SIZE;
      }
      
      // Sécurité pour éviter les boucles infinies
      if (allData.length >= 10000) hasMore = false;
    }

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

    allData.forEach(p => {
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

    // Si on passe au statut maquette envoyée, on date l'envoi
    if (req.body.statut === 'maquette_envoyee') {
      updates.maquette_sent_at = new Date().toISOString();
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
