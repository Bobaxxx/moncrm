import { useState, useEffect } from 'react';
import { X, Trash2, CheckSquare, Square, FileText, Calendar, Users, GripVertical, Layers } from 'lucide-react';
import { bulkDeleteImports, updateImportOrder, updateImport } from '../../services/api';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function SheetManager({ imports: initialImports, folders, onClose, onRefresh }) {
  const [imports, setImports] = useState(initialImports);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    setImports(initialImports);
  }, [initialImports]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === imports.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(imports.map(i => i.id));
    }
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    
    const items = Array.from(imports);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setImports(items);

    try {
      await updateImportOrder(items.map(i => i.id));
      onRefresh(); // On prévient le parent pour la barre du bas
    } catch (err) {
      console.error('Reorder error:', err);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    const totalProspects = imports
      .filter(i => selectedIds.includes(i.id))
      .reduce((acc, curr) => acc + curr.lignes_importees, 0);

    if (!confirm(`Supprimer définitivement ${selectedIds.length} feuille(s) et ${totalProspects} prospects ?`)) return;

    setLoading(true);
    try {
      await bulkDeleteImports(selectedIds);
      onRefresh();
      onClose();
    } catch (err) {
      console.error('Bulk delete error:', err);
      alert('Erreur lors de la suppression groupée');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveToCategory = async () => {
    if (selectedIds.length === 0 || !newCategory.trim()) return;
    setLoading(true);
    try {
      const updates = selectedIds.map(id => updateImport(id, { category: newCategory.trim() }));
      await Promise.all(updates);
      setNewCategory('');
      setSelectedIds([]);
      onRefresh();
    } catch (err) {
      console.error('Move error:', err);
      alert('Erreur lors du déplacement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-2xl flex flex-col max-h-[85vh] shadow-[0_0_50px_rgba(0,0,0,0.5)] border-surface-700/50">
        {/* Header */}
        <div className="p-6 border-b border-surface-800 flex items-center justify-between bg-surface-900/50">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-400">
                <FileText className="w-5 h-5" />
             </div>
             <div>
                <h2 className="text-xl font-bold text-surface-50">Organisation des feuilles</h2>
                <p className="text-xs text-surface-500">Triez par glisser-déposer ou supprimez vos imports</p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-800 rounded-lg text-surface-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-surface-900/30 border-b border-surface-800/60 flex items-center justify-between">
          <button 
            onClick={toggleSelectAll}
            className="text-xs font-semibold flex items-center gap-2 text-surface-400 hover:text-surface-200 transition-colors"
          >
            {selectedIds.length === imports.length && imports.length > 0 ? <CheckSquare className="w-4 h-4 text-primary-500" /> : <Square className="w-4 h-4" />}
            Sélectionner tout ({imports.length})
          </button>
          
          <div className="text-[10px] uppercase font-bold text-surface-600 tracking-widest flex items-center gap-2">
            <GripVertical className="w-3 h-3" />
            Glisser pour ordonner
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 p-1.5 bg-primary-500/10 rounded-lg animate-fade-in">
              <select 
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="text-[10px] bg-surface-950 border border-surface-700/50 rounded-md px-2 py-1 outline-none focus:border-primary-500 w-32"
              >
                <option value="">Déplacer vers...</option>
                {folders.map(f => (
                  <option key={f.id} value={f.name}>{f.name}</option>
                ))}
              </select>
              <button 
                onClick={handleMoveToCategory}
                disabled={loading || !newCategory.trim()}
                className="text-[10px] font-bold text-primary-400 hover:text-primary-300 uppercase tracking-wider disabled:opacity-30"
              >
                 Déplacer
              </button>
            </div>
          )}
        </div>

        {/* List with Drag & Drop */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="manager-sheets">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {imports.map((imp, index) => {
                    const isSelected = selectedIds.includes(imp.id);
                    return (
                      <Draggable key={imp.id.toString()} draggableId={imp.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all
                              ${snapshot.isDragging ? 'bg-surface-800 border-primary-500/50 shadow-2xl z-5 scale-[1.02]' : 
                                isSelected 
                                ? 'bg-primary-600/10 border-primary-500/30' 
                                : 'bg-surface-900/40 border-surface-800/40'
                              } group`}
                          >
                            <div {...provided.dragHandleProps} className="p-1 hover:bg-surface-700/50 rounded text-surface-600 hover:text-surface-400 cursor-grab active:cursor-grabbing">
                               <GripVertical className="w-4 h-4" />
                            </div>

                            <div 
                              onClick={() => toggleSelect(imp.id)}
                              className={`transition-colors cursor-pointer ${isSelected ? 'text-primary-500' : 'text-surface-700 group-hover:text-surface-500'}`}
                            >
                               {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                            </div>
                            
                            <div className="w-8 h-8 rounded-lg bg-surface-800/80 flex items-center justify-center flex-shrink-0">
                               <FileText className={`w-4 h-4 ${isSelected ? 'text-primary-400' : 'text-surface-500'}`} />
                            </div>

                            <div 
                              className="flex-1 min-w-0 cursor-default"
                              onClick={() => toggleSelect(imp.id)}
                            >
                              <p className={`text-sm font-semibold truncate transition-colors ${isSelected ? 'text-surface-50' : 'text-surface-300'}`}>
                                {imp.filename}
                              </p>
                              <div className="flex items-center gap-4 mt-1 text-[10px] text-surface-500 uppercase font-bold tracking-wider">
                                 <span className="flex items-center gap-1.2">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(imp.created_at).toLocaleDateString()}
                                 </span>
                                 <span className="flex items-center gap-1.2">
                                    <Users className="w-3 h-3" />
                                    {imp.lignes_importees} prospects
                                 </span>
                                 <span className="flex items-center gap-1.2 text-primary-400">
                                    <Layers className="w-3 h-3" />
                                    {imp.category || 'Serrurier'}
                                 </span>
                              </div>
                            </div>
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

          {imports.length === 0 && (
            <div className="py-20 text-center text-surface-500 text-sm">
               Aucune feuille à gérer.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-surface-800 bg-surface-900/50 flex items-center justify-end gap-4">
          <button 
            onClick={onClose}
            className="btn-ghost py-2 text-sm"
          >
            Fermer
          </button>
          
          {selectedIds.length > 0 && (
            <button 
              onClick={handleDelete}
              disabled={loading}
              className={`btn-primary bg-red-600 hover:bg-red-500 border-red-500 shadow-red-900/20 py-2 text-sm flex items-center gap-2
                ${loading ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
            >
              <Trash2 className="w-4 h-4" />
              {loading ? 'Suppression...' : `Supprimer la sélection (${selectedIds.length})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
