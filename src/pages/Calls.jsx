import { useState, useEffect, useCallback, useRef } from 'react';
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
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import { 
  getProspects, 
  updateProspect, 
  getImportHistory, 
  getAnalyticsSummary,
  createPlanningTask,
  getFolders
} from '../services/api';
import { STATUT_APPEL_COLORS, STATUT_APPEL_LABELS } from '../utils/constants';

export default function Calls() {
  const [prospects, setProspects] = useState([]);
  const [imports, setImports] = useState([]);
  const [folders, setFolders] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [callGoal, setCallGoal] = useState(() => {
    return parseInt(localStorage.getItem('daily_call_goal') || '40', 10);
  });
  const [callsToday, setCallsToday] = useState(0);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState(callGoal);
  
  // Note auto-save feedback state
  const [savingNotesId, setSavingNotesId] = useState(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Tab scroll states
  const scrollRef = useRef(null);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    statut_appel: 'to_call_all', // default filter: all that need to be called
    import_id: '',
    category: '',
    departement: '',
  });
  
  // Scheduler State
  const [schedulingProspect, setSchedulingProspect] = useState(null);
  const [callbackDate, setCallbackDate] = useState('');
  const [callbackTime, setCallbackTime] = useState('09:00');
  const [callbackNotes, setCallbackNotes] = useState('');
  const [scheduling, setScheduling] = useState(false);

  // Scroll functions for tabs
  const checkOverflow = useCallback(() => {
    if (scrollRef.current) {
      const { scrollWidth, clientWidth } = scrollRef.current;
      setHasOverflow(scrollWidth > clientWidth);
    }
  }, []);

  useEffect(() => {
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [checkOverflow, imports]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const maxScroll = scrollWidth - clientWidth;
      if (maxScroll > 0) {
        setScrollPercent((scrollLeft / maxScroll) * 100);
      }
    }
  };

  const handleSliderChange = (e) => {
    const val = parseFloat(e.target.value);
    setScrollPercent(val);
    if (scrollRef.current) {
      const { scrollWidth, clientWidth } = scrollRef.current;
      const maxScroll = scrollWidth - clientWidth;
      scrollRef.current.style.scrollBehavior = 'auto';
      scrollRef.current.scrollLeft = (val / 100) * maxScroll;
      scrollRef.current.style.scrollBehavior = 'smooth';
    }
  };

  const scrollTabs = (direction) => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      const offset = direction === 'left' ? -clientWidth / 2 : clientWidth / 2;
      scrollRef.current.scrollLeft += offset;
    }
  };

  // Load Metadata (imports, folders)
  const loadMetadata = async () => {
    try {
      const [importsRes, foldersRes] = await Promise.all([
        getImportHistory(),
        getFolders()
      ]);
      const fetchedImports = importsRes.data || [];
      const fetchedFolders = foldersRes.data || [];
      setImports(fetchedImports);
      setFolders(fetchedFolders);

      // Select initial category
      let initialCategory = activeCategory;
      if (!initialCategory) {
        if (fetchedFolders.length > 0) {
          initialCategory = fetchedFolders[0].name;
        } else if (fetchedImports.length > 0) {
          const categories = [...new Set(fetchedImports.map(i => i.category || 'Serrurier'))];
          if (categories.length > 0) initialCategory = categories[0];
        }
      }
      if (initialCategory) {
        setActiveCategory(initialCategory);
        setFilters(prev => ({ ...prev, category: initialCategory, import_id: '' }));
      }
    } catch (err) {
      console.error('Error loading metadata:', err);
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
  const loadProspects = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const currentPage = isLoadMore ? page + 1 : 1;
      const params = {
        search: filters.search,
        departement: filters.departement,
        page: currentPage,
        limit: 50,
      };

      if (filters.import_id) {
        params.import_id = filters.import_id;
      } else if (filters.category) {
        params.category = filters.category;
      }

      params.statut_appel = filters.statut_appel;

      const res = await getProspects(params);
      const resData = res.data;
      const list = resData.data || [];

      if (isLoadMore) {
        setProspects(prev => [...prev, ...list]);
        setPage(currentPage);
      } else {
        setProspects(list);
        setPage(1);
      }

      setHasMore(resData.hasMore);
    } catch (err) {
      console.error('Error loading prospects:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, page]);

  useEffect(() => {
    loadMetadata();
    loadStats();
  }, []);

  // Synchronize category filter with activeCategory
  useEffect(() => {
    if (activeCategory) {
      setFilters(prev => ({ ...prev, category: activeCategory, import_id: '' }));
    }
  }, [activeCategory]);

  // Trigger loading when filters change
  useEffect(() => {
    loadProspects(false);
  }, [filters]);

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
      loadProspects(false); // Rollback
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
    <div className="h-[calc(100vh-120px)] flex flex-col gap-4 animate-fade-in relative max-w-6xl mx-auto">
      {/* Header and Call Goal Counter */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch gap-6 flex-shrink-0">
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
        <div className="glass-card p-5 lg:w-96 flex items-center gap-5 relative overflow-hidden group flex-shrink-0">
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
              {callsToday >= callGoal ? "Objectif atteint ! Félicitations !" : `${callGoal - callsToday} appels restants.`}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="glass-card p-5 flex-shrink-0">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              className="input-field pl-10 text-sm py-2.5 appearance-none bg-surface-900 shadow-xl"
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

      {/* Main Calling Queue Section (Height-adaptive) */}
      <div className="flex-1 min-h-0 bg-surface-900/20 border border-surface-800/40 rounded-xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {loading && prospects.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
            </div>
          ) : prospects.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center space-y-4 p-8">
              <Phone className="w-14 h-14 text-surface-600 opacity-30 animate-pulse-soft" />
              <h3 className="text-xl font-bold text-surface-300">Aucun prospect dans cette catégorie</h3>
              <p className="text-sm text-surface-500 max-w-md">
                Tous les prospects de ce fichier ont été appelés ou n'existent pas avec les critères sélectionnés.
              </p>
            </div>
          ) : (
            <>
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
                              <span className="text-[9px] text-primary-400 animate-pulse">Sauvegarde...</span>
                            )}
                          </div>
                          <textarea
                            defaultValue={prospect.notes || ''}
                            onBlur={(e) => handleSaveNotes(prospect.id, e.target.value)}
                            placeholder="Ajouter une note (besoins, relances...)"
                            rows="2"
                            className="input-field text-xs py-2 px-3 resize-none bg-surface-950/40"
                          />
                        </div>
                      </div>

                      {/* Divider line */}
                      <div className="w-full md:w-px bg-surface-900 md:my-0 my-1 self-stretch" />

                      {/* Right Side: Quick Action Buttons */}
                      <div className="w-full md:w-64 flex flex-col justify-center gap-2">
                        <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest text-center md:text-left mb-1">
                          Résultat de l'appel
                        </p>
                        
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

                        <button 
                          onClick={() => handleUpdateStatus(prospect, 'message_laisse')}
                          className={`w-full py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-between transition-all 
                            ${prospect.statut_appel === 'message_laisse' 
                              ? 'bg-slate-500/20 border-slate-500/50 text-slate-400' 
                              : 'bg-surface-900 border-surface-800 text-surface-300 hover:bg-slate-500/10 hover:border-slate-500/20 hover:text-slate-400'}`}
                        >
                          <span>✉️ Message laissé</span>
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

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

              {/* Load More Button */}
              {hasMore && (
                <div className="p-4 flex justify-center">
                  <button 
                    onClick={() => loadProspects(true)}
                    disabled={loadingMore}
                    className="px-8 py-3 bg-surface-900 border border-surface-800 rounded-2xl text-primary-400 font-bold text-xs uppercase tracking-widest hover:bg-surface-800 transition-all disabled:opacity-50 flex items-center gap-3 shadow-xl"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                        Chargement...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Charger plus de prospects
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Tab Bar */}
        <div className="bg-surface-950 border-t border-surface-800/60 h-10 flex items-center px-1 flex-shrink-0">
          <div className="flex items-center gap-1 border-r border-surface-800 px-2 mr-2">
            <button onClick={() => scrollTabs('left')} className="p-1 hover:bg-surface-800 rounded transition-colors text-surface-500">
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {hasOverflow && (
              <div className="w-24 mx-1 flex items-center">
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="0.1"
                  value={scrollPercent}
                  onChange={handleSliderChange}
                  className="w-full h-1 bg-surface-800 rounded-lg appearance-none cursor-pointer accent-primary-500 opacity-60 hover:opacity-100"
                />
              </div>
            )}

            <button onClick={() => scrollTabs('right')} className="p-1 hover:bg-surface-800 rounded transition-colors text-surface-500">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Folder tabs (Trades/Corps de métier) */}
          <div className="flex items-center gap-1 border-r border-surface-800 px-2 mr-2 overflow-x-auto no-scrollbar max-w-[320px]">
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => setActiveCategory(folder.name)}
                className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase transition-all whitespace-nowrap flex items-center gap-1
                  ${activeCategory === folder.name 
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' 
                    : 'bg-surface-800/40 text-surface-500 hover:text-surface-300 border border-transparent'
                  }`}
              >
                <Layers className="w-2.5 h-2.5" />
                {folder.name}
              </button>
            ))}
          </div>

          {/* Sheets tabs (CSV imports) */}
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            onWheel={(e) => {
              if (scrollRef.current) {
                scrollRef.current.style.scrollBehavior = 'auto';
                scrollRef.current.scrollLeft += e.deltaY;
                scrollRef.current.style.scrollBehavior = 'smooth';
              }
            }}
            className="flex-1 flex items-end h-full overflow-x-auto sleek-scrollbar-x scroll-smooth gap-0 px-2 pb-1"
          >
            {/* General category tab */}
            <div
              onClick={() => setFilters(prev => ({ ...prev, import_id: '', category: activeCategory || '' }))}
              className={`h-8 px-4 flex items-center gap-2 text-xs font-semibold translate-y-[1px] border-x border-t transition-all duration-200 whitespace-nowrap cursor-pointer rounded-t-lg
                ${filters.import_id === '' 
                  ? 'bg-surface-900 border-surface-700/60 text-primary-400 z-10 shadow-[0_-4px_12px_rgba(99,102,241,0.1)]' 
                  : 'bg-transparent border-transparent text-surface-500 hover:text-surface-300 hover:bg-surface-900/40'
                }`}
            >
              <Layers className="w-3 h-3" />
              Général
            </div>

            {/* Sheets items */}
            {imports
              .filter(imp => (imp.category || 'Serrurier') === activeCategory)
              .map((imp) => {
                const isActive = filters.import_id.toString() === imp.id.toString();
                const filename = (imp.filename || 'Import').replace('.csv', '').replace('.json', '');
                
                return (
                  <div
                    key={imp.id}
                    onClick={() => setFilters(prev => ({ ...prev, import_id: imp.id, category: '' }))}
                    className={`h-8 px-4 flex items-center gap-2 text-xs font-medium translate-y-[1px] border-x border-t transition-all duration-200 whitespace-nowrap cursor-pointer rounded-t-lg
                      ${isActive
                        ? 'bg-surface-900 border-surface-700/60 text-primary-400 z-10 shadow-[0_-4px_15px_rgba(0,0,0,0.4)]' 
                        : 'bg-transparent border-transparent text-surface-500 hover:text-surface-300 hover:bg-surface-900/40'
                      }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${imp.is_completed ? 'bg-emerald-500' : 'bg-surface-600'}`} />
                    <span className="max-w-[130px] truncate">{filename}</span>
                    <span className="text-[10px] text-surface-600">({imp.lignes_importees || 0})</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

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
              <label className="text-xs font-semibold text-surface-400">Objectif quotidien</label>
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
              Relance téléphonique pour <strong className="text-white">{schedulingProspect.nom_entreprise}</strong>.
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
              <label className="text-xs font-semibold text-surface-400">Notes de relance</label>
              <textarea
                value={callbackNotes}
                onChange={(e) => setCallbackNotes(e.target.value)}
                placeholder="Ex : proposer la maquette..."
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
