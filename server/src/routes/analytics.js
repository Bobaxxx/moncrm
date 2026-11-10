import { Router } from 'express';
import { supabase } from '../db/database.js';
import { getOffre, TRACKED_STATUTS, SIGNED_STATUT } from '../utils/offre.js';

const router = Router();

// Logs d'activité limités aux prospects de l'espace courant
const logsForOffre = (offre, columns) => supabase
  .from('activity_logs')
  .select(`${columns}, prospects!inner(offre)`)
  .eq('prospects.offre', offre);

const emptyDays = (days, keys) => {
  const report = {};
  for (let i = 0; i <= days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    report[dateStr] = { date: dateStr };
    keys.forEach(k => { report[dateStr][k] = 0; });
  }
  return report;
};

// GET /api/analytics/daily-report
router.get('/daily-report', async (req, res) => {
  const offre = getOffre(req);
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await logsForOffre(offre, 'new_value, created_at')
      .eq('event_type', 'status_change')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(10000);

    if (error) throw error;

    // Grouping by day and status
    const report = emptyDays(days, TRACKED_STATUTS[offre]);

    data.forEach(log => {
      const dateStr = new Date(log.created_at).toISOString().split('T')[0];
      if (report[dateStr] && report[dateStr][log.new_value] !== undefined) {
        report[dateStr][log.new_value]++;
      }
    });

    const result = Object.values(report).sort((a, b) => a.date.localeCompare(b.date));
    res.json(result);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/summary
router.get('/summary', async (req, res) => {
  const offre = getOffre(req);
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await logsForOffre(offre, 'new_value, event_type')
      .in('event_type', ['status_change', 'call_status_change'])
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);

    if (error) throw error;

    const statusCount = (value) => data.filter(l => l.event_type === 'status_change' && l.new_value === value).length;

    const summary = {
      signatures: statusCount(SIGNED_STATUT[offre]),
      appels: data.filter(l => l.event_type === 'call_status_change' && ['appele', 'a_rappeler', 'message_laisse', 'pas_interesse'].includes(l.new_value)).length
    };

    if (offre === 'saas') {
      summary.contacts = statusCount('visite_ou_contact_tente');
      summary.echanges = statusCount('echange_qualifie');
      summary.demos = statusCount('demo_faite');
      summary.essais = statusCount('essai_actif');
    } else {
      summary.sms = statusCount('sms_envoye');
      summary.maquettes = statusCount('maquette_envoyee');
    }

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/calls-report
router.get('/calls-report', async (req, res) => {
  const offre = getOffre(req);
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await logsForOffre(offre, 'new_value, created_at')
      .eq('event_type', 'call_status_change')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(10000);

    if (error) throw error;

    const report = emptyDays(days, ['appele', 'a_rappeler', 'message_laisse', 'pas_interesse', 'total']);

    data.forEach(log => {
      const dateStr = new Date(log.created_at).toISOString().split('T')[0];
      if (report[dateStr] && log.new_value !== 'total' && report[dateStr][log.new_value] !== undefined) {
        report[dateStr][log.new_value]++;
        report[dateStr].total++;
      }
    });

    const result = Object.values(report).sort((a, b) => a.date.localeCompare(b.date));
    res.json(result);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analytics/call-session?from=ISO&to=ISO
// Bilan d'une session d'appels : chaque prospect appelé sur la période, avec son
// dernier résultat, sa note et son prochain rappel programmé.
// from/to sont calculés par le navigateur (fuseau local) pour couvrir "la journée".
router.get('/call-session', async (req, res) => {
  const offre = getOffre(req);
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'Paramètres from et to requis' });

  try {
    const { data: logs, error: logsError } = await logsForOffre(offre, 'prospect_id, new_value, created_at')
      .eq('event_type', 'call_status_change')
      .gte('created_at', from)
      .lt('created_at', to)
      .order('created_at', { ascending: true })
      .limit(5000);
    if (logsError) throw logsError;

    // Un prospect peut avoir été appelé plusieurs fois : on garde le dernier résultat
    const byProspect = new Map();
    for (const log of logs) {
      const entry = byProspect.get(log.prospect_id) || { attempts: 0, results: [] };
      entry.attempts++;
      entry.results.push(log.new_value);
      entry.result = log.new_value;
      entry.called_at = log.created_at;
      byProspect.set(log.prospect_id, entry);
    }

    const ids = [...byProspect.keys()];
    const prospects = [];
    const PROSPECT_COLUMNS = 'id, nom_entreprise, telephone, dirigeant, ville, departement, effectif, activite, notes, classement, statut, statut_appel';
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await supabase.from('prospects')
        .select(PROSPECT_COLUMNS)
        .eq('offre', offre)
        .in('id', ids.slice(i, i + 200));
      if (error) throw error;
      prospects.push(...data);
    }

    // Rappels programmés et pas encore faits (en retard, aujourd'hui, demain...)
    const { data: callbacks, error: cbError } = await supabase.from('planning_tasks')
      .select(`id, date, heure_debut, description, prospect_id, prospects!inner(${PROSPECT_COLUMNS}, offre)`)
      .eq('type', 'appel')
      .eq('completed', false)
      .eq('prospects.offre', offre)
      .order('date', { ascending: true })
      .order('heure_debut', { ascending: true, nullsFirst: false })
      .limit(1000);
    if (cbError) throw cbError;

    // Prochain rappel de chaque prospect de la session
    const nextCallback = new Map();
    for (const cb of callbacks) {
      if (!nextCallback.has(cb.prospect_id)) nextCallback.set(cb.prospect_id, { date: cb.date, heure: cb.heure_debut });
    }

    const session = prospects
      .map(p => ({ ...p, ...byProspect.get(p.id), next_callback: nextCallback.get(p.id) || null }))
      .sort((a, b) => b.called_at.localeCompare(a.called_at));

    res.json({
      session,
      callbacks: callbacks.map(({ prospects: p, ...cb }) => ({ ...cb, prospect: p }))
    });
  } catch (error) {
    console.error('Call session error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
