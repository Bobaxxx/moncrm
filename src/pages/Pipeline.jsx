import { useState, useEffect, useCallback, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { RefreshCw, Search, Plus } from 'lucide-react';
import ProspectCard from '../components/pipeline/ProspectCard';
import PhoneModal from '../components/pipeline/PhoneModal';
import AddProspectModal from '../components/database/AddProspectModal';
import { getKanbanData, updateProspect, getImportHistory } from '../services/api';
import { STATUT_LABELS, STATUT_COLORS, STATUT_ORDER } from '../utils/constants';

export default function Pipeline() {
  const [columns, setColumns] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pendingMove, setPendingMove] = useState(null); // { id, destCol, prospectName }
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedImport, setSelectedImport] = useState('');
  const [importHistory, setImportHistory] = useState([]);
  
  const containerRef = useRef(null);
  const topScrollRef = useRef(null);

  useEffect(() => {
    if (loading) return;
    
    const container = containerRef.current;
    const topScroll = topScrollRef.current;
    if (!container || !topScroll) return;

    const syncTop = () => {
      if (Math.abs(topScroll.scrollLeft - container.scrollLeft) > 1) {
        topScroll.scrollLeft = container.scrollLeft;
      }
    };
    const syncContainer = () => {
      if (Math.abs(container.scrollLeft - topScroll.scrollLeft) > 1) {
        container.scrollLeft = topScroll.scrollLeft;
      }
    };

    container.addEventListener('scroll', syncTop);
    topScroll.addEventListener('scroll', syncContainer);

    const resizeObserver = new ResizeObserver(() => {
      const scrollWidth = container.scrollWidth;
      const dummyChild = topScroll.firstChild;
      if (dummyChild) {
        dummyChild.style.width = `${scrollWidth}px`;
      }
    });

    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', syncTop);
      topScroll.removeEventListener('scroll', syncContainer);
      resizeObserver.disconnect();
    };
  }, [loading, columns]); // Re-sync if columns/items change

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [kanbanRes, importRes] = await Promise.all([
        getKanbanData(),
        getImportHistory()
      ]);
      setColumns(kanbanRes.data);
      setImportHistory(importRes.data || []);
    } catch (err) {
      console.error('Kanban error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const prospectId = parseInt(draggableId);
    const sourceCol = source.droppableId;
    const destCol = destination.droppableId;

    // Optimistic update
    setColumns(prev => {
      const next = { ...prev };
      const sourceItems = [...(next[sourceCol] || [])];
      const [moved] = sourceItems.splice(source.index, 1);
      moved.statut = destCol;

      if (sourceCol === destCol) {
        sourceItems.splice(destination.index, 0, moved);
        next[sourceCol] = sourceItems;
      } else {
        const destItems = [...(next[destCol] || [])];
        destItems.splice(destination.index, 0, moved);
        next[sourceCol] = sourceItems;
        next[destCol] = destItems;
      }
      return next;
    });

    // Persist
    if (sourceCol !== destCol) {
      if (destCol === 'maquette_envoyee') {
        const movedProspect = columns[sourceCol].find(p => p.id === prospectId);
        setPendingMove({ id: prospectId, destCol, prospectName: movedProspect?.nom_entreprise || 'le prospect' });
      } else {
        try {
          await updateProspect(prospectId, { statut: destCol });
        } catch (err) {
          console.error('Update error:', err);
          loadData(); // Rollback
        }
      }
    }
  };

  const handlePhoneConfirm = async (phoneName) => {
    const { id, destCol } = pendingMove;
    setPendingMove(null);

    // Mettre à jour l'état local immédiatement pour que le nom s'affiche
    setColumns(prev => {
      const next = { ...prev };
      for (const col in next) {
        next[col] = next[col].map(p => p.id === id ? { ...p, maquette_phone: phoneName, statut: destCol } : p);
      }
      return next;
    });

    try {
      await updateProspect(id, { statut: destCol, maquette_phone: phoneName });
    } catch (err) {
      console.error('Update error with phone:', err);
      // Fallback si la colonne n'existe pas en base
      try {
        await updateProspect(id, { statut: destCol });
      } catch (e2) {
        console.error('Final update error:', e2);
        loadData(); // Rollback total si tout échoue
      }
    }
  };

  const handleDelete = (prospectId) => {
    setColumns(prev => {
      const next = {};
      for (const [key, items] of Object.entries(prev)) {
        next[key] = items.filter(p => p.id !== prospectId);
      }
      return next;
    });
  };

  const filterProspects = (prospects) => {
    let filtered = prospects;
    
    if (selectedImport) {
      filtered = filtered.filter(p => p.import_id?.toString() === selectedImport.toString());
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p =>
        p.nom_entreprise.toLowerCase().includes(q) ||
        p.telephone?.includes(q) ||
        p.departement?.toLowerCase().includes(q) ||
        p.notes?.toLowerCase().includes(q)
      );
    }
    
    return filtered;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-50">Pipeline</h1>
          <p className="text-surface-500 mt-2">Glissez-déposez les prospects entre les colonnes</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2 whitespace-nowrap bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4 cursor-pointer" />
            Nouveau prospect
          </button>
          
          <select 
            value={selectedImport}
            onChange={(e) => setSelectedImport(e.target.value)}
            className="input-field py-1.5 text-xs w-48 bg-surface-900 border-surface-800"
          >
            <option value="">Toutes les feuilles</option>
            <option value="null">Sans feuille (Anciens)</option>
            {importHistory.map(imp => (
              <option key={imp.id} value={imp.id}>
                {imp.filename.replace('.csv', '').replace('.json', '')}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 text-sm w-48"
              id="pipeline-search"
            />
          </div>
          <button
            onClick={loadData}
            className="btn-ghost flex items-center gap-2"
            id="pipeline-refresh"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>
      </div>

      {/* Top Scrollbar for easier navigation */}
      <div 
        ref={topScrollRef}
        className="overflow-x-auto overflow-y-hidden h-3 -mb-4 relative z-10 top-scrollbar"
        style={{ width: 'calc(100% + 1rem)', margin: '0 -0.5rem -1rem' }}
      >
        <div style={{ height: '1px' }}></div>
      </div>

      {/* Kanban board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div 
          ref={containerRef}
          className="flex gap-4 overflow-x-auto pb-6 -mx-2 px-2"
        >
          {STATUT_ORDER.map(statut => {
            const items = filterProspects(columns[statut] || []);
            const colors = STATUT_COLORS[statut];

            return (
              <div key={statut} className="kanban-column flex-shrink-0">
                {/* Column header */}
                <div className="flex items-center gap-2.5 px-2 py-2.5 mb-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                  <h3 className="text-sm font-semibold text-surface-300 flex-1">
                    {STATUT_LABELS[statut]}
                  </h3>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                    {items.length}
                  </span>
                </div>

                {/* Droppable area */}
                <Droppable droppableId={statut}>
                  {(provided, snapshot) => {
                    const isLimited = ['a_contacter', 'sms_envoye'].includes(statut);
                    const displayItems = isLimited ? items.slice(0, 5) : items;
                    const hiddenCount = isLimited && items.length > 5 ? items.length - 5 : 0;

                    return (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 space-y-2.5 min-h-[200px] rounded-xl p-1.5 transition-colors duration-200
                          ${snapshot.isDraggingOver ? 'bg-primary-500/5 border border-dashed border-primary-500/20' : 'border border-transparent'}`}
                      >
                        {displayItems.map((prospect, index) => (
                          <Draggable
                            key={prospect.id}
                            draggableId={String(prospect.id)}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <ProspectCard
                                  prospect={prospect}
                                  isDragging={snapshot.isDragging}
                                  onDelete={handleDelete}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {hiddenCount > 0 && !search && (
                          <div className="py-4 text-center bg-surface-900/40 rounded-xl border border-dashed border-surface-800/60">
                             <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest italic">
                                + {hiddenCount} autres prospects
                             </p>
                             <p className="text-[9px] text-surface-600 mt-1">
                                Utilise la recherche pour les voir
                             </p>
                          </div>
                        )}

                        {items.length === 0 && (
                          <div className="text-center py-8 text-surface-600 text-xs">
                            Aucun prospect
                          </div>
                        )}
                      </div>
                    );
                  }}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <PhoneModal 
        isOpen={!!pendingMove}
        onClose={() => {
          if (pendingMove) {
             updateProspect(pendingMove.id, { statut: pendingMove.destCol }).catch(console.error);
          }
          setPendingMove(null);
        }}
        onConfirm={handlePhoneConfirm}
        prospectName={pendingMove?.prospectName}
      />

      <AddProspectModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onRefresh={loadData}
      />
    </div>
  );
}
