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

export default router;
