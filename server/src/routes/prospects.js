import { Router } from 'express';
import { supabase } from '../db/database.js';
import { getOffre, PIPELINE_STATUTS, SIGNED_STATUT } from '../utils/offre.js';

const router = Router();

// GET /api/prospects - Liste avec filtres et pagination
router.get('/', async (req, res) => {
  const { search, statut, statut_appel, departement, source, category, page, limit, nopagination, import_id, has_phone } = req.query;
  const offre = getOffre(req);
  console.log('GET /api/prospects - Filters:', { offre, search, statut, statut_appel, departement, source, category, page, limit, nopagination, import_id });

  let query;

  if (category) {
    // On doit utiliser select avec !inner pour filtrer par catégorie jointe
    query = supabase.from('prospects').select('*, import_history!inner(category)', { count: 'exact' })
                 .eq('import_history.category', category);
  } else {
    // Inclure les infos d'import dans tous les cas
    query = supabase.from('prospects').select('*, import_history(category)', { count: 'exact' });
  }

  // Cloisonnement par espace (Site web / SaaS)
  query = query.eq('offre', offre);

  // Appliquer les filtres
  if (search) {
    const q = String(search).replace(/[,()]/g, ' ');
    query = query.or(`nom_entreprise.ilike.%${q}%,telephone.ilike.%${q}%,dirigeant.ilike.%${q}%,ville.ilike.%${q}%,activite.ilike.%${q}%`);
  }
  if (statut) {
    query = query.ilike('statut', statut);
  }
  if (statut_appel) {
    if (statut_appel === 'to_call_all') {
      query = query.or('statut_appel.in.(a_appeler,a_rappeler,message_laisse),statut_appel.is.null');
    } else {
      query = query.eq('statut_appel', statut_appel);
    }
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
  if (has_phone === 'true') {
    query = query.not('telephone', 'is', null).neq('telephone', '');
  }

  // Tri par défaut : plus récents d'abord (par date de création),
  // avec l'ID en second critère pour garantir un ordre stable et cohérent.
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

// Compte les changements de statut (historique) pour l'espace courant
const countStatusLogs = async (offre, newValue, fromIso = null, toIso = null) => {
  let q = supabase
    .from('activity_logs')
    .select('id, prospects!inner(offre)', { count: 'exact', head: true })
    .eq('event_type', 'status_change')
    .eq('new_value', newValue)
    .eq('prospects.offre', offre);
  if (fromIso) q = q.gte('created_at', fromIso);
  if (toIso) q = q.lte('created_at', toIso);
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
};

// Charge toutes les lignes d'une requête (contourne la limite de 1000 lignes de Supabase)
const fetchAll = async (buildQuery, max = 20000) => {
  let all = [];
  let from = 0;
  const PAGE_SIZE = 1000;
  while (all.length < max) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
};

// GET /api/prospects/stats - Statistiques de l'espace courant
router.get('/stats', async (req, res) => {
  const offre = getOffre(req);
  try {
    const prospects = await fetchAll(() =>
      supabase.from('prospects').select('statut, source, departement, montant_mensuel').eq('offre', offre)
    );

    const stats = {
      offre,
      total: prospects.length,
      byStatut: [],
      bySource: [],
      byDepartement: []
    };

    const statusMap = {};
    const sourceMap = {};
    const deptMap = {};

    prospects.forEach(p => {
      statusMap[p.statut] = (statusMap[p.statut] || 0) + 1;
      sourceMap[p.source] = (sourceMap[p.source] || 0) + 1;
      if (p.departement) deptMap[p.departement] = (deptMap[p.departement] || 0) + 1;
    });

    // Statuts dans l'ordre du pipeline de l'espace
    const order = PIPELINE_STATUTS[offre];
    const rank = (s) => { const i = order.indexOf(s); return i === -1 ? 99 : i; };
    stats.byStatut = Object.entries(statusMap)
      .map(([statut, count]) => ({ statut, count }))
      .sort((a, b) => rank(a.statut) - rank(b.statut));
    stats.bySource = Object.entries(sourceMap).map(([source, count]) => ({ source, count }));
    stats.byDepartement = Object.entries(deptMap)
      .map(([departement, count]) => ({ departement, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const today = new Date().toISOString().split('T')[0];
    const dayStart = `${today}T00:00:00`;
    const dayEnd = `${today}T23:59:59`;

    if (offre === 'saas') {
      const [contactsToday, contactsTotal, demosToday, demosTotal, abonnesTotal] = await Promise.all([
        countStatusLogs(offre, 'visite_ou_contact_tente', dayStart, dayEnd),
        countStatusLogs(offre, 'visite_ou_contact_tente'),
        countStatusLogs(offre, 'demo_faite', dayStart, dayEnd),
        countStatusLogs(offre, 'demo_faite'),
        countStatusLogs(offre, 'abonne')
      ]);
      const abonnes = prospects.filter(p => p.statut === SIGNED_STATUT.saas);
      stats.saas = {
        contactsToday,
        contactsTotal,
        demosToday,
        demosTotal,
        essaisActifs: statusMap.essai_actif || 0,
        abonnes: abonnes.length,
        perdus: statusMap.perdu || 0,
        mrr: abonnes.reduce((acc, p) => acc + (Number(p.montant_mensuel) || 0), 0),
        // Part des démos qui ont abouti à un abonnement (historique)
        tauxDemoAbonne: demosTotal > 0 ? Math.round((abonnesTotal / demosTotal) * 100) : 0
      };
      return res.json(stats);
    }

    // Espace Site web : stats SMS / maquettes
    const { count: smsToday } = await supabase
      .from('prospects')
      .select('*', { count: 'exact', head: true })
      .eq('offre', offre)
      .gte('sms_sent_at', dayStart)
      .lte('sms_sent_at', dayEnd);
    stats.smsToday = smsToday || 0;

    const [smsTotal, maquettesToday, maquettesTotal] = await Promise.all([
      countStatusLogs(offre, 'sms_envoye'),
      countStatusLogs(offre, 'maquette_envoyee', dayStart, dayEnd),
      countStatusLogs(offre, 'maquette_envoyee')
    ]);
    stats.smsTotal = smsTotal;
    stats.maquettesToday = maquettesToday;
    stats.maquettesTotal = maquettesTotal;

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

// Champs modifiables / créables depuis le frontend
const EDITABLE_FIELDS = [
  'nom_entreprise', 'telephone', 'adresse', 'url_site', 'departement', 'statut', 'statut_appel',
  'notes', 'maquette_phone', 'siren',
  'ville', 'code_postal', 'activite', 'code_naf', 'effectif', 'dirigeant',
  'url_fiche', 'linkedin_url', 'raison_perte',
  'contrat_type', 'has_maintenance', 'montant_mensuel'
];

// POST /api/prospects - Création manuelle
router.post('/', async (req, res) => {
  const offre = getOffre(req);
  const body = req.body || {};

  const nom_entreprise = String(body.nom_entreprise || '').trim();
  const telephone = String(body.telephone || '').trim() || null;

  if (!nom_entreprise) {
    return res.status(400).json({ error: "Nom de l'entreprise obligatoire" });
  }
  // Le téléphone reste obligatoire pour l'espace Site web (prospection SMS)
  if (offre === 'site_web' && !telephone) {
    return res.status(400).json({ error: 'Nom et téléphone obligatoires' });
  }

  const insert = { source: 'manuel' };
  EDITABLE_FIELDS.forEach(f => {
    if (body[f] !== undefined && body[f] !== '') insert[f] = body[f];
  });
  insert.nom_entreprise = nom_entreprise;
  insert.telephone = telephone;
  insert.statut = body.statut || 'a_contacter';
  insert.offre = offre;
  if (!insert.departement && insert.ville) insert.departement = insert.ville;
  if (insert.statut === 'abonne') insert.contrat_type = 'abonnement';

  try {
    const { data, error } = await supabase
      .from('prospects')
      .insert(insert)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Un prospect avec ce téléphone existe déjà dans cet espace' });
      }
      throw error;
    }
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
    delete finalUpdates.id;
    delete finalUpdates.offre;

    // Si on marque comme SMS envoyé, on ajoute le timestamp
    if (updates.statut === 'sms_envoye') {
      finalUpdates.sms_sent_at = new Date().toISOString();
    }

    // Si on marque comme maquette envoyée, on ajoute le timestamp
    if (updates.statut === 'maquette_envoyee') {
      finalUpdates.maquette_sent_at = new Date().toISOString();
    }

    // SaaS : un abonné est forcément sous contrat d'abonnement
    if (updates.statut === 'abonne') {
      finalUpdates.contrat_type = 'abonnement';
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

// GET /api/prospects/kanban - Groupé par statut (colonnes de l'espace courant)
router.get('/kanban', async (req, res) => {
  const offre = getOffre(req);
  try {
    const allData = await fetchAll(() =>
      supabase
        .from('prospects')
        .select('*')
        .eq('offre', offre)
        .order('updated_at', { ascending: false })
        .order('id', { ascending: true }),
      10000
    );

    const columns = {};
    PIPELINE_STATUTS[offre].forEach(statut => { columns[statut] = []; });

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
      .select('statut, statut_appel')
      .eq('id', id)
      .single();

    const updates = { ...req.body, updated_at: new Date().toISOString() };

    // On ne laisse jamais changer l'id ou l'espace par cette route
    delete updates.id;
    delete updates.offre;
    delete updates.created_at;
    delete updates.import_history;

    // Si on passe au statut SMS envoyé, on date l'envoi
    if (req.body.statut === 'sms_envoye') {
      updates.sms_sent_at = new Date().toISOString();
    }

    // Si on passe au statut maquette envoyée, on date l'envoi
    if (req.body.statut === 'maquette_envoyee') {
      updates.maquette_sent_at = new Date().toISOString();
    }

    // SaaS : un abonné est forcément sous contrat d'abonnement
    if (req.body.statut === 'abonne' && oldProspect?.statut !== 'abonne') {
      updates.contrat_type = 'abonnement';
    }

    // Un téléphone vide devient NULL (unicité par espace)
    if (updates.telephone !== undefined && String(updates.telephone ?? '').trim() === '') {
      updates.telephone = null;
    }

    const { data, error } = await supabase
      .from('prospects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // 2. Logger le changement de statut du pipeline
    if (req.body.statut && oldProspect && oldProspect.statut !== req.body.statut) {
      await logActivity(id, 'status_change', oldProspect.statut, req.body.statut);
    }

    // 3. Logger le changement de statut d'appel
    if (req.body.statut_appel && oldProspect && oldProspect.statut_appel !== req.body.statut_appel) {
      await logActivity(id, 'call_status_change', oldProspect.statut_appel, req.body.statut_appel);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/prospects/:id/logs - Historique d'un prospect
router.get('/:id/logs', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('prospect_id', id)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
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
