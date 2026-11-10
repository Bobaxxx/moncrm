import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Phone,
  PhoneCall,
  CalendarClock,
  Check,
  Loader2,
  UserSearch,
  FileText,
  AlertCircle,
  Repeat
} from 'lucide-react';
import { getCallSession, updatePlanningTask } from '../services/api';
import { STATUT_APPEL_COLORS, STATUT_APPEL_LABELS } from '../utils/constants';
import { useStatuts } from '../contexts/useWorkspace';
import { CLASSEMENTS, formatEffectif } from '../components/database/ProspectTable';

// Ordre d'affichage des groupes : ce qui demande une action d'abord
const RESULT_ORDER = ['a_rappeler', 'appele', 'message_laisse', 'pas_interesse', 'a_appeler'];

const RESULT_HINT = {
  a_rappeler: 'Rappel à faire',
  appele: 'Joint : suite à donner',
  message_laisse: 'À relancer',
  pas_interesse: 'Clos',
  a_appeler: 'Remis dans la liste'
};

// Date locale au format YYYY-MM-DD (sans décalage UTC)
const toDateKey = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const addDays = (d, n) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
};

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const formatTime = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const formatCallbackDate = (dateKey, heure) => {
  const today = toDateKey(new Date());
  const tomorrow = toDateKey(addDays(new Date(), 1));
  let label;
  if (dateKey === today) label = "Aujourd'hui";
  else if (dateKey === tomorrow) label = 'Demain';
  else {
    const [y, m, d] = dateKey.split('-').map(Number);
    label = new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  return heure ? `${label} à ${heure.slice(0, 5)}` : label;
};

function ClassementBadge({ value }) {
  if (!value || !CLASSEMENTS[value]) return null;
  return (
    <span className={`w-5 h-5 inline-flex items-center justify-center rounded-md text-[10px] font-black border ${CLASSEMENTS[value].active}`} title={CLASSEMENTS[value].label}>
      {value}
    </span>
  );
}

function ProspectLine({ p, isSaas }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
      <Link to={`/prospect/${p.id}`} className="font-bold text-white hover:text-primary-400 transition-colors truncate">
        {p.nom_entreprise}
      </Link>
      {isSaas && <ClassementBadge value={p.classement} />}
      {isSaas && p.effectif && (
        <span className="text-[10px] font-semibold text-surface-400 bg-surface-900 border border-surface-800 px-1.5 py-0.5 rounded">
          {formatEffectif(p.effectif)} sal.
        </span>
      )}
      <span className="text-xs text-surface-500 truncate">
        {[p.dirigeant, p.ville || p.departement].filter(Boolean).join(' · ')}
      </span>
      {p.telephone && (
        <a href={`tel:${p.telephone}`} className="flex items-center gap-1 text-xs font-mono text-primary-400 hover:text-primary-300">
          <Phone className="w-3 h-3" />
          {p.telephone}
        </a>
      )}
    </div>
  );
}

export default function CallSession() {
  const { isSaas } = useStatuts();
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [data, setData] = useState({ session: [], callbacks: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completingId, setCompletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCallSession(day.toISOString(), addDays(day, 1).toISOString());
      setData(res.data);
    } catch (err) {
      console.error('Call session load error:', err);
      setError(err.response?.data?.error || 'Impossible de charger le bilan.');
    } finally {
      setLoading(false);
    }
  }, [day]);

  useEffect(() => { load(); }, [load]);

  const handleCallbackDone = async (task) => {
    setCompletingId(task.id);
    try {
      await updatePlanningTask(task.id, { completed: true });
      setData(prev => ({ ...prev, callbacks: prev.callbacks.filter(c => c.id !== task.id) }));
    } catch (err) {
      alert('Impossible de marquer le rappel comme fait : ' + (err.response?.data?.error || err.message));
    } finally {
      setCompletingId(null);
    }
  };

  const todayKey = toDateKey(new Date());
  const tomorrowKey = toDateKey(addDays(new Date(), 1));
  const isToday = toDateKey(day) === todayKey;

  // Rappels à faire : en retard, aujourd'hui, demain (relatif à la vraie date du jour)
  const callbackGroups = [
    { key: 'late', label: 'En retard', tone: 'text-rose-400', items: data.callbacks.filter(c => c.date < todayKey) },
    { key: 'today', label: "Aujourd'hui", tone: 'text-indigo-300', items: data.callbacks.filter(c => c.date === todayKey) },
    { key: 'tomorrow', label: 'Demain', tone: 'text-surface-300', items: data.callbacks.filter(c => c.date === tomorrowKey) }
  ].filter(g => g.items.length > 0);

  const groups = RESULT_ORDER
    .map(result => ({ result, items: data.session.filter(p => p.result === result) }))
    .filter(g => g.items.length > 0);

  const dayLabel = day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Bilan de session</h1>
          <p className="text-surface-400 mt-1">Ce que tu as noté pour chaque appel, et qui rappeler ensuite.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDay(d => addDays(d, -1))} className="p-2 rounded-lg bg-surface-900 border border-surface-800 text-surface-400 hover:text-white" title="Jour précédent">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1.5 text-sm font-semibold text-surface-200 capitalize min-w-[190px] text-center">{dayLabel}</span>
          <button onClick={() => setDay(d => addDays(d, 1))} disabled={isToday} className="p-2 rounded-lg bg-surface-900 border border-surface-800 text-surface-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed" title="Jour suivant">
            <ChevronRight className="w-4 h-4" />
          </button>
          {!isToday && (
            <button onClick={() => setDay(startOfDay(new Date()))} className="px-3 py-2 rounded-lg bg-primary-600/20 border border-primary-500/30 text-primary-300 text-xs font-bold hover:bg-primary-600/30">
              Aujourd'hui
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="py-24 flex justify-center"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>
      ) : (
        <>
          {/* Rappels à faire */}
          <section className="glass-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">Rappels à faire</h2>
              <span className="text-xs text-surface-500">(programmés depuis la page Appels)</span>
            </div>
            {callbackGroups.length === 0 ? (
              <p className="text-sm text-surface-500">Aucun rappel en retard, aujourd'hui ou demain.</p>
            ) : callbackGroups.map(group => (
              <div key={group.key} className="space-y-2">
                <h3 className={`text-[11px] font-bold uppercase tracking-wider ${group.tone}`}>
                  {group.label} · {group.items.length}
                </h3>
                {group.items.map(cb => (
                  <div key={cb.id} className="flex items-start gap-3 p-3 rounded-xl bg-surface-950/50 border border-surface-800/60">
                    <span className="text-xs font-bold text-indigo-300 whitespace-nowrap pt-0.5 min-w-[64px]">
                      {group.key === 'late' ? formatCallbackDate(cb.date) : (cb.heure_debut?.slice(0, 5) || '—')}
                    </span>
                    <div className="flex-1 min-w-0 space-y-1">
                      {cb.prospect && <ProspectLine p={cb.prospect} isSaas={isSaas} />}
                      {cb.description && <p className="text-xs text-surface-300 whitespace-pre-line">{cb.description}</p>}
                    </div>
                    <button
                      onClick={() => handleCallbackDone(cb)}
                      disabled={completingId === cb.id}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-50 whitespace-nowrap"
                      title="Marquer ce rappel comme fait"
                    >
                      {completingId === cb.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Fait
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </section>

          {/* Compteurs de la session */}
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 text-xs font-bold">
              <PhoneCall className="w-3.5 h-3.5" /> {data.session.length} prospect{data.session.length > 1 ? 's' : ''} appelé{data.session.length > 1 ? 's' : ''}
            </span>
            {groups.map(({ result, items }) => {
              const c = STATUT_APPEL_COLORS[result] || STATUT_APPEL_COLORS.a_appeler;
              return (
                <span key={result} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${c.bg} ${c.text} ${c.border}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                  {STATUT_APPEL_LABELS[result] || result} · {items.length}
                </span>
              );
            })}
          </div>

          {/* Détail de la session, groupé par résultat */}
          {data.session.length === 0 ? (
            <div className="glass-card p-12 text-center text-surface-500">
              Aucun appel enregistré ce jour-là.
            </div>
          ) : groups.map(({ result, items }) => {
            const c = STATUT_APPEL_COLORS[result] || STATUT_APPEL_COLORS.a_appeler;
            return (
              <section key={result} className="space-y-2">
                <h2 className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider ${c.text}`}>
                  <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                  {STATUT_APPEL_LABELS[result] || result}
                  <span className="text-surface-600 normal-case font-medium tracking-normal">· {items.length} · {RESULT_HINT[result]}</span>
                </h2>
                {items.map(p => (
                  <div key={p.id} className="glass-card p-4 flex gap-4">
                    <div className="flex flex-col items-center gap-1 pt-0.5 min-w-[48px]">
                      <span className="text-xs font-bold text-surface-300">{formatTime(p.called_at)}</span>
                      {p.attempts > 1 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-surface-500" title={`${p.attempts} résultats saisis ce jour-là`}>
                          <Repeat className="w-3 h-3" /> {p.attempts}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <ProspectLine p={p} isSaas={isSaas} />
                      {p.next_callback && (
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                          <CalendarClock className="w-3.5 h-3.5" />
                          Rappel prévu : {formatCallbackDate(p.next_callback.date, p.next_callback.heure)}
                        </p>
                      )}
                      {p.statut_appel && p.statut_appel !== p.result && (
                        <p className="text-[11px] text-surface-500 italic">
                          Statut actuel : {STATUT_APPEL_LABELS[p.statut_appel] || p.statut_appel}
                        </p>
                      )}
                      {p.notes ? (
                        <div className="flex gap-2 text-sm text-surface-200 bg-surface-950/50 border border-surface-800/60 rounded-lg p-3">
                          <FileText className="w-3.5 h-3.5 text-surface-500 mt-0.5 shrink-0" />
                          <p className="whitespace-pre-line break-words min-w-0">{p.notes}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-surface-600 italic">Aucune note.</p>
                      )}
                    </div>
                    <Link to={`/prospect/${p.id}`} className="self-start p-1.5 rounded-lg text-surface-500 hover:text-primary-400 hover:bg-primary-500/10" title="Voir la fiche">
                      <UserSearch className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
