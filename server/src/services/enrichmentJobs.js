// Traitements d'enrichissement en masse, exécutés en arrière-plan.
// Un seul traitement à la fois ; l'état est gardé en mémoire (perdu au redémarrage du serveur,
// les prospects déjà traités gardent leur enrichment_status et ne sont pas re-cherchés).

import { randomUUID } from 'crypto';
import { supabase } from '../db/database.js';
import { enrichProspect, EnrichmentFatalError } from './phoneEnrichment.js';

const MAX_PER_JOB = Number(process.env.ENRICHMENT_MAX_PER_JOB) || 1000;
const RETRY_STATUSES = ['not_found', 'ambiguous', 'error'];

const jobs = new Map();
let activeJobId = null;
let lastJobId = null;

const snapshot = (job) => job && ({
  id: job.id,
  status: job.status,          // running | done | cancelled | failed
  label: job.label,
  total: job.total,
  processed: job.processed,
  found: job.found,
  notFound: job.notFound,
  ambiguous: job.ambiguous,
  duplicates: job.duplicates,
  errors: job.errors,
  error: job.error,
  recent: job.recent,
  startedAt: job.startedAt,
  finishedAt: job.finishedAt
});

export const getJob = (id) => snapshot(jobs.get(id));
export const getCurrentJob = () => snapshot(jobs.get(activeJobId) || jobs.get(lastJobId));

// Prospects SaaS sans téléphone correspondant au filtre
// filter : { import_id, import_ids, category, ids, retry }
const buildTargetQuery = (filter, columns, options) => {
  let query = filter.category
    ? supabase.from('prospects').select(`${columns}, import_history!inner(category)`, options).eq('import_history.category', filter.category)
    : supabase.from('prospects').select(columns, options);

  query = query.eq('offre', 'saas').is('telephone', null);

  if (filter.ids?.length) query = query.in('id', filter.ids);
  if (filter.import_id) query = query.eq('import_id', filter.import_id);
  if (filter.import_ids?.length) query = query.in('import_id', filter.import_ids);

  // Par défaut on ne re-cherche pas ce qui a déjà été tenté (chaque recherche est facturée)
  query = filter.retry
    ? query.or(`enrichment_status.is.null,enrichment_status.in.(${RETRY_STATUSES.join(',')})`)
    : query.is('enrichment_status', null);

  return query;
};

export const countTargets = async (filter = {}) => {
  const { count, error } = await buildTargetQuery(filter, 'id', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
};

const loadTargets = async (filter) => {
  const { data, error } = await buildTargetQuery(filter, 'id, nom_entreprise, ville, code_postal, adresse, url_site')
    .order('id', { ascending: true })
    .limit(MAX_PER_JOB);
  if (error) throw error;
  return data || [];
};

const runJob = async (job, targets) => {
  try {
    for (const prospect of targets) {
      if (job.cancelRequested) {
        job.status = 'cancelled';
        break;
      }
      const result = await enrichProspect(prospect);
      job.processed++;
      if (result.status === 'found') job.found++;
      else if (result.status === 'not_found') job.notFound++;
      else if (result.status === 'ambiguous') job.ambiguous++;
      else if (result.status === 'duplicate_phone') job.duplicates++;
      else job.errors++;

      job.recent = [result, ...job.recent].slice(0, 8);
    }
    if (job.status === 'running') job.status = 'done';
  } catch (err) {
    job.status = 'failed';
    job.error = err instanceof EnrichmentFatalError ? err.message : `Erreur inattendue : ${err.message}`;
    console.error('[Enrichment] Job failed:', err);
  } finally {
    job.finishedAt = new Date().toISOString();
    if (activeJobId === job.id) activeJobId = null;
    lastJobId = job.id;
  }
};

export const startJob = async (filter = {}, label = 'Enrichissement des téléphones') => {
  if (activeJobId) {
    const err = new Error('Un enrichissement est déjà en cours');
    err.status = 409;
    err.job = getJob(activeJobId);
    throw err;
  }

  const targets = await loadTargets(filter);
  const job = {
    id: randomUUID(),
    status: 'running',
    label,
    total: targets.length,
    processed: 0,
    found: 0,
    notFound: 0,
    ambiguous: 0,
    duplicates: 0,
    errors: 0,
    error: null,
    recent: [],
    cancelRequested: false,
    startedAt: new Date().toISOString(),
    finishedAt: null
  };
  jobs.set(job.id, job);
  activeJobId = job.id;

  // On ne garde que les 20 derniers traitements en mémoire
  if (jobs.size > 20) jobs.delete(jobs.keys().next().value);

  runJob(job, targets); // volontairement non attendu : tourne en arrière-plan
  return snapshot(job);
};

export const cancelJob = (id) => {
  const job = jobs.get(id);
  if (!job) return null;
  if (job.status === 'running') job.cancelRequested = true;
  return snapshot(job);
};
