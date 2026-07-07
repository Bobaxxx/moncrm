import { useState, useEffect, useCallback } from 'react';
import { 
  Phone, 
  PhoneCall, 
  Search, 
  Layers, 
  MapPin, 
  Clipboard, 
  Check, 
  Calendar, 
  MessageSquare, 
  X, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  FileText, 
  AlertCircle,
  Loader2,
  Bookmark
} from 'lucide-react';
import { 
  getProspects, 
  updateProspect, 
  getImportHistory, 
  getAnalyticsSummary,
  createPlanningTask
} from '../services/api';
import { STATUT_APPEL_COLORS, STATUT_APPEL_LABELS } from '../utils/constants';

export default function Calls() {
  const [prospects, setProspects] = useState([]);
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [callGoal, setCallGoal] = useState(() => {
    return parseInt(localStorage.getItem('daily_call_goal') || '40', 10);
  });
  const [callsToday, setCallsToday] = useState(0);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState(callGoal);
  
  // Note auto-save feedback state
  const [savingNotesId, setSavingNotesId] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    statut_appel: 'to_call_all', // default filter: all that need to be called
    import_id: '',
    departement: '',
  });
  
  // Scheduler State
  const [schedulingProspect, setSchedulingProspect] = useState(null);
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackTime, setCallbackTime] = useState('09:00');
  const [callbackNotes, setCallbackNotes] = useState('');
  const [scheduling, setScheduling] = useState(false);

  // Load Metadata (imports)
  const loadMetadata = async () => {
    try {
      const res = await getImportHistory();
      setImports(res.data || []);
    } catch (err) {
      console.error('Error loading import history:', err);
    }
  };

  // Load Today's Call Count
  const loadStats = async () => {
    try {
      const res = await getAnalyticsSummary();
      setCallsToday(res.data.appels || 0);
    } catch (err) {
      console.error('Error loading analytics summary:', err);
    }
  };

  // Load Prospects
  const loadProspects = useCallback(async () => {
    try {
      setLoading(true);
      
      // Determine backend parameters based on selected filter
      const params = {
        search: filters.search,
        import_id: filters.import_id,
        departement: filters.departement,
        nopagination: 'true', // load full list for calling queue
      };

      if (filters.statut_appel !== 'to_call_all' && filters.statut_appel !== 'all') {
        params.statut_appel = filters.statut_appel;
      }

      const res = await getProspects(params);
      let list = res.data.data || [];

      // If "to_call_all" is selected, filter frontend-side to show only prospects needing calls
      if (filters.statut_appel === 'to_call_all') {
        list = list.filter(p => 
          ['a_appeler', 'a_rappeler', 'message_laisse'].includes(p.statut_appel || 'a_appeler')
        );
      }

      setProspects(list);
    } catch (err) {
      console.error('Error loading prospects:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadMetadata();
    loadStats();
  }, []);

  useEffect(() => {
    loadProspects();
  }, [loadProspects]);

  // Update call status
  const handleUpdateStatus = async (prospect, newStatus) => {
    try {
      // Optimistic update
      setProspects(prev => prev.map(p => p.id === prospect.id ? { ...p, statut_appel: newStatus } : p));
      
      await updateProspect(prospect.id, { statut_appel: newStatus });
      
      // Refresh daily calls count from API
      loadStats();
      
    } catch (err) {
      console.error('Error updating prospect status:', err);
      loadProspects(); // Rollback
    }
  };

  // Copy to clipboard
  const handleCopyPhone = (phone, id) => {
    navigator.clipboard.writeText(phone);
    // Temporary visual feedback
    const btn = document.getElementById(`copy-btn-${id}`);
    if (btn) {
      const originalHtml = btn.innerHTML;
      btn.innerHTML = 'Copié !';
      btn.classList.add('text-emerald-400');
      setTimeout(() => {
        btn.innerHTML = originalHtml;
        btn.classList.remove('text-emerald-400');
      }, 1500);
    }
  };

  // Save Notes
  const handleSaveNotes = async (id, notesVal) => {
    try {
      setSavingNotesId(id);
      await updateProspect(id, { notes: notesVal });
      setProspects(prev => prev.map(p => p.id === id ? { ...p, notes: notesVal } : p));
    } catch (err) {
      console.error('Error saving notes:', err);
    } finally {
      setSavingNotesId(null);
    }
  };

  // Open Callback Scheduler
  const openScheduler = (prospect) => {
    setSchedulingProspect(prospect);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setCallbackDate(tomorrow.toISOString().split('T')[0]);
    setCallbackTime('10:00');
    setCallbackNotes(`Rappel suite à prospection téléphonique.`);
  };

  // Submit Callback Task
  const handleScheduleCallback = async (e) => {
    e.preventDefault();
    if (!schedulingProspect) return;

    try {
      setScheduling(true);
      
      // 1. Create planning task
      await createPlanningTask({
        titre: `Appel: ${schedulingProspect.nom_entreprise}`,
        description: callbackNotes,
        type: 'appel',
        date: callbackDate,
        heure_debut: callbackTime,
        heure_fin: null,
        completed: false,
        prospect_id: schedulingProspect.id,
        couleur: '#6366f1' // Indigo
      });

      // 2. Set prospect status to 'a_rappeler'
      await handleUpdateStatus(schedulingProspect, 'a_rappeler');
      
      setSchedulingProspect(null);
    } catch (err) {
      console.error('Error scheduling callback:', err);
    } finally {
      setScheduling(false);
    }
  };

  const handleSaveGoal = () => {
    localStorage.setItem('daily_call_goal', newGoal.toString());
    setCallGoal(newGoal);
    setShowGoalModal(false);
  };

  // Stats computation
  const percentComplete = Math.min(Math.round((callsToday / callGoal) * 100), 100);

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Header and Call Goal Counter */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
              <PhoneCall className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-surface-50">Appels du jour</h1>
          </div>
          <p className="text-surface-500 mt-2">
            Passez vos appels, qualifiez vos prospects et gérez vos relances téléphoniques en direct.
          </p>
        </div>

        {/* Goal Card */}
        <div className="glass-card p-5 lg:w-96 flex items-center gap-5 relative overflow-hidden group">
          <div className="relative w-18 h-18 flex items-center justify-center flex-shrink-0">
            {/* SVG circle progress */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="36"
                cy="36"
                r="30"
                className="stroke-surface-800"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="36"
                cy="36"
                r="30"
                className="stroke-primary-500 transition-all duration-1000 ease-out"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 30}`}
                strokeDashoffset={`${2 * Math.PI * 30 * (1 - percentComplete / 100)}`}
              />
            </svg>
            <span className="absolute text-sm font-bold text-white">{percentComplete}%</span>
          </div>

          <div className="flex-1">
            <div className="flex justify-between items-center">
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Objectif journalier</p>
              <button 
                onClick={() => { setNewGoal(callGoal); setShowGoalModal(true); }}
                className="text-[10px] font-bold text-primary-400 hover:text-primary-300 uppercase tracking-wider"
              >
                Modifier
              </button>
            </div>
            <p className="text-2xl font-bold mt-1 text-white">
              {callsToday} <span className="text-surface-500 text-sm">/ {callGoal} appels</span>
            </p>
            <p className="text-xs text-surface-500 mt-1">
              {callsToday >= callGoal ? "Objectif atteint ! Félicitations !" : `${callGoal - callsToday} appels restants pour aujourd'hui.`}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="glass-card p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              type="text"
              placeholder="Rechercher nom, téléphone..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="input-field pl-10 text-sm py-2.5"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <Layers className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <select
              value={filters.statut_appel}
              onChange={(e) => setFilters(prev => ({ ...prev, statut_appel: e.target.value }))}
              className="input-field pl-10 text-sm py-2.5 appearance-none"
            >
              <option value="to_call_all">📞 À appeler / relancer (Filtre intelligent)</option>
              <option value="all">Tout afficher</option>
              <option value="a_appeler">À appeler</option>
              <option value="a_rappeler">À rappeler</option>
              <option value="message_laisse">Message laissé</option>
              <option value="appele">Appelé (Répondu)</option>
              <option value="pas_interesse">Pas intéressé</option>
            </select>
          </div>

          {/* Category/Import filter */}
          <div className="relative">
            <Bookmark className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <select
              value={filters.import_id}
              onChange={(e) => setFilters(prev => ({ ...prev, import_id: e.target.value }))}
              className="input-field pl-10 text-sm py-2.5 appearance-none"
            >
              <option value="">Toutes les catégories</option>
              {imports.map(imp => (
                <option key={imp.id} value={imp.id}>
                  {imp.category || 'Serrurier'} - {imp.filename.slice(0, 20)}...
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              type="text"
              placeholder="Département (ex: 75, 69)"
              value={filters.departement}
              onChange={(e) => setFilters(prev => ({ ...prev, departement: e.target.value }))}
              className="input-field pl-10 text-sm py-2.5"
            />
          </div>
        </div>
      </div>

      {/* Main Calling Queue */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
        </div>
      ) : prospects.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-4">
          <Phone className="w-14 h-14 text-surface-600 mx-auto opacity-30 animate-pulse-soft" />
          <h3 className="text-xl font-bold text-surface-300">Aucun prospect dans la file d'attente</h3>
          <p className="text-sm text-surface-500 max-w-md mx-auto">
            Ajustez vos filtres de recherche ou importez de nouveaux prospects pour commencer la prospection.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs text-surface-500 font-semibold px-2">
            <span>{prospects.length} prospects trouvés</span>
            <span>Cliquez sur le numéro pour passer l'appel</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {prospects.map((prospect) => {
              const statusColorObj = STATUT_APPEL_COLORS[prospect.statut_appel || 'a_appeler'] || STATUT_APPEL_COLORS.a_appeler;
              
              return (
                <div 
                  key={prospect.id} 
                  className="glass-card p-5 hover:border-surface-800 transition-all group flex flex-col md:flex-row gap-5 items-start md:items-stretch"
                >
                  {/* Left Side: Enterprise Details */}
                  <div className="flex-1 min-w-0 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-white truncate group-hover:text-primary-400 transition-colors">
                          {prospect.nom_entreprise}
                        </h3>
                        <div className="flex flex-wrap gap-2 items-center mt-1 text-xs text-surface-500">
                          {prospect.departement && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-primary-400" />
                              {prospect.departement}
                            </span>
                          )}
                          {prospect.import_history?.category && (
                            <span className="bg-surface-900 border border-surface-800 px-2 py-0.5 rounded text-[10px] font-medium text-surface-400">
                              {prospect.import_history.category}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Current Status Badge */}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusColorObj.bg} ${statusColorObj.text} ${statusColorObj.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusColorObj.dot}`} />
                        {STATUT_APPEL_LABELS[prospect.statut_appel || 'a_appeler']}
                      </span>
                    </div>

                    {/* Phone block */}
                    <div className="flex items-center gap-3">
                      <a 
                        href={`tel:${prospect.telephone}`}
                        className="flex items-center gap-2 text-primary-400 hover:text-primary-300 font-bold text-sm bg-primary-500/5 hover:bg-primary-500/10 border border-primary-500/10 hover:border-primary-500/20 px-3.5 py-1.5 rounded-xl transition-all"
                      >
                        <Phone className="w-4 h-4" />
                        {prospect.telephone}
                      </a>
                      <button 
                        id={`copy-btn-${prospect.id}`}
                        onClick={() => handleCopyPhone(prospect.telephone, prospect.id)}
                        className="p-2 text-surface-500 hover:text-white rounded-lg hover:bg-surface-800 transition-all"
                        title="Copier le numéro"
                      >
                        <Clipboard className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quick Notes Textarea */}
                    <div className="pt-2">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider flex items-center gap-1">
                          <FileText className="w-3 h-3 text-surface-500" /> Notes du prospect
                        </label>
                        {savingNotesId === prospect.id && (
                          <span className="text-[9px] text-primary-400 animate-pulse">Sauvegarde en cours...</span>
                        )}
                      </div>
                      <textarea
                        defaultValue={prospect.notes || ''}
                        onBlur={(e) => handleSaveNotes(prospect.id, e.target.value)}
                        placeholder="Ajouter une note (compte-rendu d'appel, décision, besoin...)"
                        rows="2"
                        className="input-field text-xs py-2 px-3 resize-none bg-surface-950/40"
                      />
                    </div>
                  </div>

                  {/* Divider line for mobile */}
                  <div className="w-full md:w-px bg-surface-900 md:my-0 my-1 self-stretch" />

                  {/* Right Side: Quick Calling Action Buttons */}
                  <div className="w-full md:w-64 flex flex-col justify-center gap-2">
                    <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest text-center md:text-left mb-1">
                      Résultat de l'appel
                    </p>
                    
                    {/* Log Success / Answered */}
                    <button 
                      onClick={() => handleUpdateStatus(prospect, 'appele')}
                      className={`w-full py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-between transition-all 
                        ${prospect.statut_appel === 'appele' 
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                          : 'bg-surface-900 border-surface-800 text-surface-300 hover:bg-emerald-500/10 hover:border-emerald-500/20 hover:text-emerald-400'}`}
                    >
                      <span>✔️ Appelé (Répondu)</span>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Log Message Left */}
                    <button 
                      onClick={() => handleUpdateStatus(prospect, 'message_laisse')}
                      className={`w-full py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-between transition-all 
                        ${prospect.statut_appel === 'message_laisse' 
                          ? 'bg-slate-500/20 border-slate-500/50 text-slate-400' 
                          : 'bg-surface-900 border-surface-800 text-surface-300 hover:bg-slate-500/10 hover:border-slate-500/20 hover:text-slate-400'}`}
                    >
                      <span>✉️ Message laissé (Répéteur)</span>
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>

                    {/* Log Recall Needed */}
                    <button 
                      onClick={() => openScheduler(prospect)}
                      className={`w-full py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-between transition-all 
                        ${prospect.statut_appel === 'a_rappeler' 
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' 
                          : 'bg-surface-900 border-surface-800 text-surface-300 hover:bg-indigo-500/10 hover:border-indigo-500/20 hover:text-indigo-400'}`}
                    >
                      <span>📅 À rappeler (Programmer)</span>
                      <Clock className="w-3.5 h-3.5" />
                    </button>

                    {/* Log Not Interested */}
                    <button 
                      onClick={() => handleUpdateStatus(prospect, 'pas_interesse')}
                      className={`w-full py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-between transition-all 
                        ${prospect.statut_appel === 'pas_interesse' 
                          ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' 
                          : 'bg-surface-900 border-surface-800 text-surface-300 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400'}`}
                    >
                      <span>❌ Pas intéressé</span>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Goal Update Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-card max-w-sm w-full p-6 space-y-4 animate-scale-in border-surface-800">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Objectif d'appels</h3>
              <button 
                onClick={() => setShowGoalModal(false)}
                className="p-1 hover:bg-surface-800 rounded-lg text-surface-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-surface-400">Objectif quotidien (nombre d'appels)</label>
              <input
                type="number"
                min="1"
                max="200"
                value={newGoal}
                onChange={(e) => setNewGoal(Math.max(1, parseInt(e.target.value) || 1))}
                className="input-field text-sm font-semibold"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setShowGoalModal(false)}
                className="flex-1 btn-secondary text-xs py-2.5"
              >
                Annuler
              </button>
              <button 
                onClick={handleSaveGoal}
                className="flex-1 btn-primary text-xs py-2.5"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Callback Scheduler Modal */}
      {schedulingProspect && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <form onSubmit={handleScheduleCallback} className="glass-card max-w-md w-full p-6 space-y-4 animate-scale-in border-surface-800">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" /> Programmer un Rappel
              </h3>
              <button 
                type="button"
                onClick={() => setSchedulingProspect(null)}
                className="p-1 hover:bg-surface-800 rounded-lg text-surface-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-surface-400">
              Programmez un appel de relance pour <strong className="text-white">{schedulingProspect.nom_entreprise}</strong>. Cela créera une tâche dans votre calendrier de prospection.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-surface-400">Date</label>
                <input
                  type="date"
                  required
                  value={callbackDate}
                  onChange={(e) => setCallbackDate(e.target.value)}
                  className="input-field text-sm py-2"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-surface-400">Heure</label>
                <input
                  type="time"
                  required
                  value={callbackTime}
                  onChange={(e) => setCallbackTime(e.target.value)}
                  className="input-field text-sm py-2"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-surface-400">Instructions / Notes de rappel</label>
              <textarea
                value={callbackNotes}
                onChange={(e) => setCallbackNotes(e.target.value)}
                placeholder="Ex : rappliquer pour présenter la maquette..."
                rows="3"
                className="input-field text-sm resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setSchedulingProspect(null)}
                className="flex-1 btn-secondary text-xs py-2.5"
                disabled={scheduling}
              >
                Annuler
              </button>
              <button 
                type="submit"
                className="flex-1 btn-primary bg-indigo-600 hover:bg-indigo-500 border-indigo-600 hover:border-indigo-500 text-xs py-2.5 flex items-center justify-center gap-2"
                disabled={scheduling}
              >
                {scheduling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Planifier
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
