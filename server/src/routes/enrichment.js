import { Router } from 'express';
import { supabase } from '../db/database.js';
import {
  enrichProspect, isEnrichmentConfigured, getUsage, EnrichmentFatalError,
  getProvider, PROVIDER_LABELS, NOT_CONFIGURED_MESSAGE
} from '../services/phoneEnrichment.js';
import { startJob, getJob, getCurrentJob, cancelJob, countTargets } from '../services/enrichmentJobs.js';

const router = Router();

const NOT_CONFIGURED = { error: NOT_CONFIGURED_MESSAGE };

// Filtre commun (sélection de la page Base de données)
const readFilter = (src = {}) => ({
  import_id: src.import_id || undefined,
  category: src.category || undefined,
  ids: Array.isArray(src.ids) ? src.ids : undefined,
  retry: src.retry === true || src.retry === 'true'
});

// GET /api/enrichment/status - Configuration, quota du jour et traitement en cours
router.get('/status', (req, res) => {
  res.json({
    configured: isEnrichmentConfigured(),
    provider: getProvider(),
    providerLabel: PROVIDER_LABELS[getProvider()] || null,
    ...getUsage(),
    job: getCurrentJob()
  });
});

// GET /api/enrichment/phones/pending - Nombre de leads SaaS à enrichir pour un filtre
router.get('/phones/pending', async (req, res) => {
  try {
    const count = await countTargets(readFilter(req.query));
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/enrichment/phones/bulk - Lance un enrichissement en masse (arrière-plan)
router.post('/phones/bulk', async (req, res) => {
  if (!isEnrichmentConfigured()) return res.status(503).json(NOT_CONFIGURED);
  try {
    const job = await startJob(readFilter(req.body), 'Enrichissement des téléphones manquants');
    res.json(job);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message, job: error.job });
  }
});

// GET /api/enrichment/jobs/:id - Progression d'un traitement
router.get('/jobs/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Traitement introuvable (le serveur a peut-être redémarré)' });
  res.json(job);
});

// POST /api/enrichment/jobs/:id/cancel - Arrêt (après la recherche en cours)
router.post('/jobs/:id/cancel', (req, res) => {
  const job = cancelJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Traitement introuvable' });
  res.json(job);
});

// POST /api/enrichment/prospects/:id/phone - Recherche immédiate pour un prospect
router.post('/prospects/:id/phone', async (req, res) => {
  if (!isEnrichmentConfigured()) return res.status(503).json(NOT_CONFIGURED);
  try {
    const { data: prospect, error } = await supabase
      .from('prospects')
      .select('id, nom_entreprise, ville, code_postal, adresse, url_site, telephone')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;

    if (prospect.telephone) {
      return res.status(400).json({ error: 'Ce prospect a déjà un numéro de téléphone.' });
    }

    const result = await enrichProspect(prospect);
    res.json(result);
  } catch (error) {
    const status = error instanceof EnrichmentFatalError ? 503 : 500;
    res.status(status).json({ error: error.message });
  }
});

export default router;
