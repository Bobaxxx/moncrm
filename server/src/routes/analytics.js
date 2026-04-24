import { Router } from 'express';
import { supabase } from '../db/database.js';

const router = Router();

// GET /api/analytics/daily-report
router.get('/daily-report', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
      .from('activity_logs')
      .select('new_value, created_at')
      .eq('event_type', 'status_change')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Grouping by day and status
    const report = {};
    
    // Initialiser les derniers jours
    for (let i = 0; i <= days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        report[dateStr] = {
            date: dateStr,
            sms_envoye: 0,
            maquette_demandee: 0,
            maquette_envoyee: 0,
            client_signe: 0
        };
    }

    data.forEach(log => {
      const logDate = new Date(log.created_at);
      const dateStr = logDate.toISOString().split('T')[0];
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
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
            .from('activity_logs')
            .select('new_value')
            .eq('event_type', 'status_change')
            .gte('created_at', `${today}T00:00:00`)
            .lte('created_at', `${today}T23:59:59`);

        if (error) throw error;

        const summary = {
            sms: data.filter(l => l.new_value === 'sms_envoye').length,
            maquettes: data.filter(l => l.new_value === 'maquette_envoyee').length,
            signatures: data.filter(l => l.new_value === 'client_signe').length
        };

        res.json(summary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
