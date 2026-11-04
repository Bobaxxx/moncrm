import { PhoneCall, X, Square, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

const STATUS_TEXT = {
  found: 'trouvé',
  not_found: 'introuvable',
  ambiguous: 'incertain',
  duplicate_phone: 'numéro déjà utilisé',
  error: 'erreur'
};

const STATUS_TONE = {
  found: 'text-emerald-400',
  not_found: 'text-surface-500',
  ambiguous: 'text-amber-400',
  duplicate_phone: 'text-amber-400',
  error: 'text-rose-400'
};

export default function EnrichmentProgress({ job, onCancel, onDismiss }) {
  if (!job) return null;

  const running = job.status === 'running';
  const percent = job.total > 0 ? Math.round((job.processed / job.total) * 100) : 100;
  const title = running
    ? 'Recherche des téléphones en cours…'
    : job.status === 'done' ? 'Recherche des téléphones terminée'
    : job.status === 'cancelled' ? 'Recherche arrêtée'
    : 'Recherche interrompue';

  return (
    <div className="glass-card p-4 border-primary-500/20 bg-primary-500/[0.03] space-y-3 animate-fade-in" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {running
            ? <Loader2 className="w-4 h-4 text-primary-400 animate-spin flex-shrink-0" />
            : job.status === 'failed'
              ? <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              : <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
          <p className="text-sm font-semibold text-surface-200 truncate">{title}</p>
          <span className="text-xs text-surface-500 tabular-nums">{job.processed} / {job.total}</span>
        </div>
        <div className="flex items-center gap-2">
          {running ? (
            <button
              onClick={onCancel}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-surface-400 hover:text-rose-300 hover:bg-rose-500/10 border border-surface-700/60 flex items-center gap-1.5"
            >
              <Square className="w-3 h-3" /> Arrêter
            </button>
          ) : (
            <button onClick={onDismiss} className="p-1 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800" aria-label="Fermer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="w-full h-2 bg-surface-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${job.status === 'failed' ? 'bg-rose-500' : 'bg-primary-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums">
        <span className="text-emerald-400 font-bold flex items-center gap-1"><PhoneCall className="w-3 h-3" /> {job.found} trouvés</span>
        <span className="text-surface-500">{job.notFound} introuvables</span>
        <span className="text-amber-400">{job.ambiguous} incertains</span>
        {job.duplicates > 0 && <span className="text-amber-400">{job.duplicates} déjà utilisés</span>}
        {job.errors > 0 && <span className="text-rose-400">{job.errors} erreurs</span>}
      </div>

      {job.error && <p className="text-xs text-rose-300">{job.error}</p>}

      {job.recent?.length > 0 && (
        <ul className="text-[11px] text-surface-500 space-y-0.5 max-h-24 overflow-y-auto no-scrollbar">
          {job.recent.map((r, i) => (
            <li key={`${r.id}-${i}`} className="flex items-center gap-2 truncate">
              <span className={`font-bold ${STATUS_TONE[r.status] || 'text-surface-500'}`}>{STATUS_TEXT[r.status] || r.status}</span>
              <span className="truncate">{r.nom_entreprise}</span>
              {r.telephone && <span className="text-surface-300 font-mono">{r.telephone}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
