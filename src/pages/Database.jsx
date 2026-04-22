import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, 
  Layers, 
  Database as DbIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2, 
  Settings2,
  GripHorizontal,
  Smartphone,
  Download
} from 'lucide-react';
import { 
  getProspects, 
  updateProspect, 
  deleteProspect, 
  getImportHistory, 
  deleteImport,
  updateImportOrder,
  bulkUpdateProspects,
  updateImportStatus,
  getFolders,
  createFolder,
  deleteFolder
} from '../services/api';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ProspectTable from '../components/database/ProspectTable';
import SheetManager from '../components/database/SheetManager';
import { STATUT_LABELS } from '../utils/constants';

export default function Database() {
  const [prospects, setProspects] = useState([]);
  const [imports, setImports] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showManager, setShowManager] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    statut: '',
    import_id: '',
  });

  const scrollRef = useRef(null);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);

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
      // On retire temporairement le smooth pour que ce soit instantané avec le slider
      scrollRef.current.style.scrollBehavior = 'auto';
      scrollRef.current.scrollLeft = (val / 100) * maxScroll;
      scrollRef.current.style.scrollBehavior = 'smooth';
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prospectsRes, importsRes, foldersRes] = await Promise.all([
        getProspects(filters),
        getImportHistory(),
        getFolders()
      ]);
      setProspects(prospectsRes.data || []);
      const fetchedImports = importsRes.data || [];
      setImports(fetchedImports);
      const fetchedFolders = foldersRes.data || [];
      setFolders(fetchedFolders);
      
      // Auto-sélection de la première catégorie si aucune n'est sélectionnée
      if (!activeCategory) {
        if (fetchedFolders.length > 0) {
          setActiveCategory(fetchedFolders[0].name);
        } else if (fetchedImports.length > 0) {
          const categories = [...new Set(fetchedImports.map(i => i.category || 'Serrurier'))];
          if (categories.length > 0) setActiveCategory(categories[0]);
        }
      }
    } catch (err) {
      console.error('Database load error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdate = async (id, data) => {
    try {
      const allowedFields = ['nom_entreprise', 'telephone', 'adresse', 'url_site', 'departement', 'statut'];
      const filteredData = {};
      allowedFields.forEach(field => {
        if (data[field] !== undefined) filteredData[field] = data[field];
      });

      await updateProspect(id, filteredData);
      setProspects(prev => prev.map(p => p.id === id ? { ...p, ...filteredData } : p));
    } catch (err) {
      console.error('Update error detailed:', err?.response?.data || err);
      alert('Erreur lors de la mise à jour : ' + (err.response?.data?.error || 'Vérifiez les données'));
    }
  };

  const handleBulkUpdate = async (ids, data) => {
    try {
      await bulkUpdateProspects(ids, data);
      setProspects(prev => prev.map(p => ids.includes(p.id) ? { ...p, ...data } : p));
    } catch (err) {
      console.error('Bulk update error:', err);
      alert('Erreur lors de la mise à jour groupée');
      loadData();
    }
  };

  const handleBulkSmsStatus = async () => {
    const toUpdate = prospects.filter(p => {
      const cleanPhone = (p.telephone || '').replace(/[\s.-]/g, '');
      const isSmsMobile = cleanPhone.startsWith('06') || cleanPhone.startsWith('07') || cleanPhone.startsWith('+336') || cleanPhone.startsWith('+337');
      const isFacebook = p.source === 'facebook' || (p.url_site && p.url_site.toLowerCase().includes('facebook.com'));
      return (isSmsMobile || isFacebook) && p.statut !== 'sms_envoye';
    });

    if (toUpdate.length === 0) {
      alert("Aucun prospect éligible trouvé (doit avoir un Facebook ou un 06/07 et ne pas déjà être en 'SMS envoyé').");
      return;
    }

    if (!confirm(`Passer ${toUpdate.length} prospects au statut 'SMS envoyé' ?`)) return;

    const ids = toUpdate.map(p => p.id);
    await handleBulkUpdate(ids, { statut: 'sms_envoye' });
  };


  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce prospect définitivement ?')) return;
    try {
      await deleteProspect(id);
      setProspects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
      alert('Erreur lors de la suppression');
    }
  };

  const handleDeleteSheet = async (e, id, name) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Supprimer ENTIÈREMENT la feuille "${name}" et ses prospects ? Cette action est irréversible.`)) return;
    
    try {
      await deleteImport(id);
      setFilters(prev => ({ ...prev, import_id: '' }));
      const importsRes = await getImportHistory();
      setImports(importsRes.data || []);
    } catch (err) {
      console.error('Sheet delete error:', err);
      alert('Erreur lors de la suppression de la feuille');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value.toString() }));
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    
    const items = Array.from(imports);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setImports(items);

    try {
      await updateImportOrder(items.map(i => i.id));
    } catch (err) {
      console.error('Reorder error:', err);
    }
  };

  const handleToggleImportStatus = async (e, id, currentStatus) => {
    e.stopPropagation();
    try {
      await updateImportStatus(id, !currentStatus);
      setImports(prev => prev.map(imp => imp.id === id ? { ...imp, is_completed: !currentStatus } : imp));
    } catch (err) {
      console.error('Toggle import status error:', err);
    }
  };

  const scrollTabs = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleDownloadCsv = () => {
    if (prospects.length === 0) {
      alert("Aucune donnée à exporter");
      return;
    }

    const headers = ["Entreprise", "Telephone", "Statut", "Ville", "Adresse", "Site Web"];
    const csvRows = [
      headers.join(','),
      ...prospects.map(p => [
        `"${(p.nom_entreprise || '').replace(/"/g, '""')}"`,
        `"${(p.telephone || '').replace(/"/g, '""')}"`,
        `"${(STATUT_LABELS[p.statut] || p.statut || '').replace(/"/g, '""')}"`,
        `"${(p.departement || '').replace(/"/g, '""')}"`,
        `"${(p.adresse || '').replace(/"/g, '""')}"`,
        `"${(p.url_site || '').replace(/"/g, '""')}"`
      ].join(','))
    ];

    const blob = new Blob(["\ufeff" + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `export_prospects_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddFolder = async () => {
    const name = prompt('Nom du nouveau dossier :');
    if (!name || name.trim() === '') return;
    
    try {
      await createFolder({ name: name.trim() });
      const res = await getFolders();
      setFolders(res.data);
      setActiveCategory(name.trim());
    } catch (err) {
      console.error('Add folder error:', err);
      alert(err.response?.data?.error || 'Erreur lors de la création du dossier');
    }
  };

  const handleDeleteFolder = async (folder) => {
    if (!confirm(`Supprimer le dossier "${folder.name}" ? Les feuilles à l'intérieur ne seront pas supprimées mais ne seront plus classées.`)) return;
    try {
      await deleteFolder(folder.id);
      const res = await getFolders();
      setFolders(res.data);
      if (activeCategory === folder.name) {
        setActiveCategory(res.data[0]?.name || null);
      }
    } catch (err) {
      console.error('Delete folder error:', err);
      alert('Erreur lors de la suppression');
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-4 animate-fade-in relative">
      {/* Header & Global Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-50 flex items-center gap-2">
              <DbIcon className="w-6 h-6 text-primary-500" />
              Ma Base de Données
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Nouveau bouton Supprimer placé ici dans le header */}
            {filters.import_id && !loading && (
              <button 
                onClick={(e) => {
                  const activeImp = imports.find(i => i.id.toString() === filters.import_id.toString());
                  if(activeImp) handleDeleteSheet(e, activeImp.id, activeImp.filename);
                }}
                className="px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-xl border border-red-500/20 transition-all flex items-center gap-2 text-xs font-bold mr-2"
                title="Supprimer toute cette feuille"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer la feuille
              </button>
            )}

            <button 
              onClick={handleBulkSmsStatus}
              className="px-3 py-1.5 bg-amber-600/10 hover:bg-amber-600/20 text-amber-500 rounded-xl border border-amber-500/20 transition-all flex items-center gap-2 text-xs font-bold mr-2"
              title="Passer en 'SMS envoyé' tous ceux qui ont Facebook ou un 06/07"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Auto-Statut SMS
            </button>

            <button 
              onClick={handleDownloadCsv}
              className="px-3 py-1.5 bg-primary-600/10 hover:bg-primary-600/20 text-primary-400 rounded-xl border border-primary-500/20 transition-all flex items-center gap-2 text-xs font-bold mr-2"
              title="Exporter les données actuelles (filtres inclus) en CSV"
            >
              <Download className="w-3.5 h-3.5" />
              Exporter
            </button>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
              <input 
                type="text" 
                placeholder="Rechercher..." 
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="input-field w-64 pl-10 py-1.5 text-sm"
              />
            </div>
            <select 
              value={filters.statut} 
              onChange={(e) => handleFilterChange('statut', e.target.value)}
              className="input-field py-1.5 text-sm bg-surface-900 shadow-xl"
            >
              <option value="">Tous les statuts</option>
              {Object.entries(STATUT_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 min-h-0 bg-surface-900/20 border border-surface-800/40 rounded-xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto bg-surface-950/40 relative no-scrollbar">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ProspectTable 
              prospects={prospects} 
              onUpdate={handleUpdate} 
              onBulkUpdate={handleBulkUpdate}
              onDelete={handleDelete} 
            />
          )}
        </div>

        {/* Sheets Tab Bar */}
        <div className="bg-surface-950 border-t border-surface-800/60 h-10 flex items-center px-1">
          <div className="flex items-center gap-1 border-r border-surface-800 px-2 mr-2">
            <button 
              onClick={() => setShowManager(true)}
              className="p-1.5 hover:bg-surface-800 rounded-lg transition-colors text-primary-400"
              title="Gérer les feuilles"
            >
              <Settings2 className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-surface-800 mx-1" />
            <button onClick={() => scrollTabs('left')} className="p-1 hover:bg-surface-800 rounded transition-colors text-surface-500">
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {hasOverflow && (
              <div className="w-32 mx-2 flex items-center group">
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="0.1"
                  value={scrollPercent}
                  onChange={handleSliderChange}
                  className="w-full h-1.5 bg-surface-800 rounded-lg appearance-none cursor-pointer accent-primary-500 hover:accent-primary-400 transition-all opacity-40 group-hover:opacity-100"
                  title="Défilement rapide"
                />
              </div>
            )}

            <button onClick={() => scrollTabs('right')} className="p-1 hover:bg-surface-800 rounded transition-colors text-surface-500">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Filtre par Dossier/Catégorie */}
          <div className="flex items-center gap-1 border-r border-surface-800 px-2 mr-2 overflow-x-auto no-scrollbar max-w-[400px]">
            {folders.map(folder => (
              <div key={folder.id} className="relative group/folder">
                <button
                  onClick={() => setActiveCategory(folder.name)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap flex items-center gap-1.5
                    ${activeCategory === folder.name 
                      ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' 
                      : 'bg-surface-800/40 text-surface-500 hover:text-surface-300 border border-transparent'
                    }`}
                >
                  <Layers className="w-3 h-3" />
                  {folder.name}
                </button>
                {activeCategory === folder.name && folder.name !== 'Serrurier' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/folder:opacity-100 transition-opacity"
                    title="Supprimer ce dossier"
                  >
                    <Trash2 className="w-2 h-2" />
                  </button>
                )}
              </div>
            ))}
            <button 
              onClick={handleAddFolder}
              className="p-1 px-2 rounded-lg bg-surface-800/20 border border-dashed border-surface-700 text-surface-500 hover:text-primary-400 hover:border-primary-500/30 transition-all"
              title="Ajouter un dossier"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            onWheel={(e) => {
              if (scrollRef.current) {
                // On retire temporairement le smooth pour la molette
                scrollRef.current.style.scrollBehavior = 'auto';
                scrollRef.current.scrollLeft += e.deltaY;
                scrollRef.current.style.scrollBehavior = 'smooth';
              }
            }}
            className="flex-1 flex items-end h-full overflow-x-auto sleek-scrollbar-x scroll-smooth gap-0 px-2 pb-1"
          >
            <div
              onClick={() => handleFilterChange('import_id', '')}
              className={`h-8 px-4 flex items-center gap-2 text-xs font-semibold translate-y-[1px] border-x border-t transition-all duration-200 whitespace-nowrap cursor-pointer rounded-t-lg
                ${filters.import_id === '' 
                  ? 'bg-surface-900 border-surface-700/60 text-primary-400 z-10 shadow-[0_-4px_12px_rgba(99,102,241,0.1)]' 
                  : 'bg-transparent border-transparent text-surface-500 hover:text-surface-300 hover:bg-surface-900/40'
                }`}
            >
              <Layers className="w-3 h-3" />
              Général
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="sheets" direction="horizontal">
                {(provided) => (
                  <div 
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="flex items-end h-full"
                  >
                    {imports
                      .filter(imp => (imp.category || 'Serrurier') === activeCategory)
                      .map((imp, index) => {
                      const isActive = filters.import_id.toString() === imp.id.toString();
                      const filename = (imp.filename || 'Import').replace('.csv', '').replace('.json', '');
                      
                      return (
                        <Draggable key={imp.id.toString()} draggableId={imp.id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => handleFilterChange('import_id', imp.id)}
                              className={`h-8 px-4 flex items-center gap-2 text-xs font-medium translate-y-[1px] border-x border-t transition-all duration-200 whitespace-nowrap cursor-pointer rounded-t-lg group
                                ${isActive
                                  ? 'bg-surface-900 border-surface-700/60 text-primary-400 z-10 shadow-[0_-4px_15px_rgba(0,0,0,0.4)]' 
                                  : 'bg-transparent border-transparent text-surface-500 hover:text-surface-300 hover:bg-surface-900/40'
                                } ${snapshot.isDragging ? 'shadow-2xl bg-surface-800 scale-105 z-50 rounded-lg' : ''}`}
                            >
                              <GripHorizontal className={`w-3 h-3 transition-opacity ${isActive ? 'opacity-50' : 'opacity-0 group-hover:opacity-30'}`} />
                              <div 
                                onClick={(e) => handleToggleImportStatus(e, imp.id, imp.is_completed)}
                                className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer border-2
                                  ${imp.is_completed 
                                    ? 'bg-emerald-500 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.4)]' 
                                    : isActive ? 'bg-primary-500 border-primary-500/20 animate-pulse' : 'bg-surface-700 border-surface-600'
                                  }`} 
                                title={imp.is_completed ? "Feuille terminée" : "Cliquer pour terminer"}
                              />
                              <span className={`max-w-[150px] truncate ${imp.is_completed ? 'opacity-50 line-through decoration-emerald-500/30' : ''}`}>
                                {filename}
                              </span>
                              <span className={`text-[10px] font-bold ${isActive ? 'text-primary-600' : 'text-surface-600'}`}>
                                ({imp.lignes_importees || 0})
                              </span>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          <div className="px-2 flex items-center gap-2">
            <button 
              onClick={() => window.location.href = '#/import'}
              className="p-1 px-3 rounded-lg hover:bg-primary-600/10 text-primary-500 hover:text-primary-400 transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border border-transparent hover:border-primary-500/20"
            >
               <Plus className="w-3.5 h-3.5" />
               Nouvelle Feuille
            </button>
          </div>
        </div>
      </div>

      {showManager && (
        <SheetManager 
          imports={imports} 
          onClose={() => setShowManager(false)} 
          onRefresh={loadData}
        />
      )}
    </div>
  );
}
