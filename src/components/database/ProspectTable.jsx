import { useState, useEffect, useRef } from 'react';
import { 
  MoreHorizontal, 
  Trash2, 
  ExternalLink, 
  Phone, 
  MapPin,
  Save,
  X,
  Edit2,
  ChevronDown,
  UserSearch,
  Copy,
  Check,
  Search,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStatuts } from '../../contexts/useWorkspace';

// Libellé affiché quand la recherche automatique n'a pas abouti
const ENRICH_FAIL_LABEL = {
  not_found: 'Introuvable',
  ambiguous: 'Incertain',
  duplicate_phone: 'N° déjà utilisé',
  error: 'Erreur'
};

// Classement manuel (espace SaaS) : A = prioritaire, B = ensuite, C = ne pas appeler
export const CLASSEMENTS = {
  A: { label: 'A · Prioritaire', active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' },
  B: { label: 'B · Ensuite', active: 'bg-amber-500/20 text-amber-300 border-amber-500/50' },
  C: { label: 'C · Ne pas appeler', active: 'bg-red-500/20 text-red-300 border-red-500/50' }
};

// "Entre 10 et 19 salariés" -> "10–19" ; "0 salarié" -> "0" ; "250 et plus" -> "250+"
export const formatEffectif = (raw) => {
  if (!raw) return '';
  const s = String(raw);
  const nums = s.match(/\d+/g);
  if (!nums) return s;
  if (nums.length >= 2) return `${nums[0]}–${nums[1]}`;
  return /plus|\+|au moins/i.test(s) ? `${nums[0]}+` : nums[0];
};

// Texte copié par le bouton "Copier les informations" (Base de données et Appels)
export const prospectInfoText = (prospect) => [
  prospect.nom_entreprise,
  prospect.dirigeant,
  prospect.adresse,
  prospect.telephone,
  prospect.departement
].filter(Boolean).join(' ');

export function ClassementPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {Object.entries(CLASSEMENTS).map(([key, { label, active }]) => (
        <button
          key={key}
          type="button"
          title={value === key ? `${label} (cliquer pour retirer)` : label}
          onClick={(e) => { e.stopPropagation(); onChange(value === key ? null : key); }}
          className={`w-6 h-6 rounded-md text-[11px] font-black border transition-all
            ${value === key
              ? active
              : 'bg-transparent text-surface-600 border-surface-800 hover:text-surface-300 hover:border-surface-600'}`}
        >
          {key}
        </button>
      ))}
    </div>
  );
}

export default function ProspectTable({ prospects, onUpdate, onBulkUpdate, onDelete, onEnrichPhone }) {
  const { STATUT_LABELS, STATUT_COLORS, isSaas } = useStatuts();
  const [enrichingIds, setEnrichingIds] = useState(() => new Set());

  const handleEnrichClick = async (id) => {
    setEnrichingIds(prev => new Set(prev).add(id));
    try {
      await onEnrichPhone(id);
    } finally {
      setEnrichingIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };
  const [editingId, setEditingId] = useState(null);
  const [statusMenuId, setStatusMenuId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const tableRef = useRef(null);

  // DRAG TO FILL STATE
  const [dragInfo, setDragInfo] = useState(null); // { startIdx, currentIdx, value }
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging && dragInfo) {
        handleCompleteDrag();
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, dragInfo]);

  const handleStartDrag = (e, index, value) => {
    e.preventDefault();
    setDragInfo({ startIdx: index, currentIdx: index, value });
    setIsDragging(true);
  };

  const handleMouseEnterRow = (index) => {
    if (isDragging) {
      setDragInfo(prev => ({ ...prev, currentIdx: index }));
    }
  };

  const handleCompleteDrag = async () => {
    const { startIdx, currentIdx, value } = dragInfo;
    setIsDragging(false);
    setDragInfo(null);

    if (startIdx === currentIdx) return;

    const min = Math.min(startIdx, currentIdx);
    const max = Math.max(startIdx, currentIdx);
    
    const idsToUpdate = prospects
      .slice(min, max + 1)
      .map(p => p.id);

    if (idsToUpdate.length > 0) {
      await onBulkUpdate(idsToUpdate, { statut: value });
    }
  };

  // Gérer le clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (editingId && tableRef.current && !tableRef.current.contains(event.target)) {
        handleCancelEdit();
      }
      if (statusMenuId && !event.target.closest('.status-selector')) {
        setStatusMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingId, statusMenuId]);

  const handleStartEdit = (prospect) => {
    setEditingId(prospect.id);
    setEditForm({ ...prospect });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async () => {
    await onUpdate(editingId, editForm);
    setEditingId(null);
  };

  const handleQuickStatusUpdate = async (id, newStatus) => {
    await onUpdate(id, { statut: newStatus });
    setStatusMenuId(null);
  };

  const handleChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCopyInfo = (prospect) => {
    navigator.clipboard.writeText(prospectInfoText(prospect));
    setCopiedId(prospect.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!prospects || prospects.length === 0) {
    return (
      <div className="glass-card p-12 text-center border-dashed border-surface-800">
        <p className="text-surface-500">Aucun prospect trouvé dans cette sélection.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden transition-all duration-300 relative select-none">
      <div className="overflow-x-auto sleek-scrollbar-x pb-2">
        <table ref={tableRef} className="w-full min-w-[1000px] text-sm text-left border-collapse">
          <thead className="sticky top-0 z-20 bg-surface-950 shadow-[0_1px_0_rgba(255,255,255,0.05)]">
            <tr className="border-b border-surface-800">
              <th className="px-4 py-3 font-semibold text-surface-400 uppercase text-[10px] tracking-wider w-[250px]">Entreprise</th>
              <th className="px-4 py-3 font-semibold text-surface-400 uppercase text-[10px] tracking-wider w-[150px]">Téléphone</th>
              <th className="px-4 py-3 font-semibold text-surface-400 uppercase text-[10px] tracking-wider w-[120px]">Statut</th>
              {isSaas && <th className="px-4 py-3 font-semibold text-surface-400 uppercase text-[10px] tracking-wider w-[110px]">Note</th>}
              {isSaas && <th className="px-4 py-3 font-semibold text-surface-400 uppercase text-[10px] tracking-wider w-[90px]">Effectif</th>}
              <th className="px-4 py-3 font-semibold text-violet-400/80 uppercase text-[10px] tracking-wider w-[100px]">AppConduc</th>
              <th className="px-4 py-3 font-semibold text-surface-400 uppercase text-[10px] tracking-wider w-[150px]">Ville</th>
              <th className="px-4 py-3 font-semibold text-surface-400 uppercase text-[10px] tracking-wider">{isSaas ? 'Dirigeant / Activité' : 'Site Web'}</th>
              <th className="px-4 py-3 font-semibold text-surface-400 uppercase text-[10px] tracking-wider w-[160px] text-right sticky right-0 bg-surface-950 z-20 shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.5)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800/20">
            {prospects.map((p, idx) => {
              const isEditing = editingId === p.id;
              const isStatusMenuOpen = statusMenuId === p.id;
              const statusColor = STATUT_COLORS[p.statut] || { bg: 'bg-surface-800', text: 'text-surface-400', dot: 'bg-surface-500' };

              // Check if this row is being "filled" by drag
              let isBeingFilled = false;
              if (isDragging && dragInfo) {
                const min = Math.min(dragInfo.startIdx, dragInfo.currentIdx);
                const max = Math.max(dragInfo.startIdx, dragInfo.currentIdx);
                isBeingFilled = idx >= min && idx <= max;
              }

              return (
                <tr 
                  key={p.id} 
                  onMouseEnter={() => handleMouseEnterRow(idx)}
                  className={`hover:bg-surface-900/40 transition-colors group relative ${isEditing ? 'bg-primary-600/5 ring-1 ring-inset ring-primary-500/20' : ''} ${isBeingFilled ? 'bg-primary-500/10' : ''}`}
                >
                  {/* Nom Entreprise */}
                  <td className="px-4 py-3">
                    {/* ... (Existing code for entreprise) ... */}
                    {isEditing ? (
                      <input 
                        autoFocus
                        type="text" 
                        value={editForm.nom_entreprise} 
                        onChange={(e) => handleChange('nom_entreprise', e.target.value)}
                        className="w-full bg-surface-950 border border-primary-500/50 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                      />
                    ) : (
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-surface-200 truncate">{p.nom_entreprise}</span>
                          {p.source !== 'maps' && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md uppercase font-bold bg-surface-800 text-surface-500 border border-surface-700/50`}>
                              {p.source}
                            </span>
                          )}
                        </div>
                        {p.adresse && (
                          <span className="text-[10px] text-surface-600 truncate max-w-[200px]" title={p.adresse}>
                             {p.adresse}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Téléphone */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={editForm.telephone || ''}
                        onChange={(e) => handleChange('telephone', e.target.value)}
                        className="w-full bg-surface-950 border border-primary-500/50 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-surface-400 font-mono text-xs">
                        <Phone className="w-3 h-3 opacity-40" />
                        {p.telephone || (onEnrichPhone ? (
                          <span className="flex items-center gap-1.5 font-sans">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEnrichClick(p.id); }}
                              disabled={enrichingIds.has(p.id)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-60"
                              title="Chercher le téléphone automatiquement"
                            >
                              {enrichingIds.has(p.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                              {enrichingIds.has(p.id) ? 'Recherche…' : 'Chercher'}
                            </button>
                            {ENRICH_FAIL_LABEL[p.enrichment_status] && !enrichingIds.has(p.id) && (
                              <span className="text-[10px] text-surface-600 italic">{ENRICH_FAIL_LABEL[p.enrichment_status]}</span>
                            )}
                          </span>
                        ) : <span className="text-surface-700 italic font-sans">—</span>)}
                      </div>
                    )}
                  </td>

                  {/* Statut - ACCÈS DIRECT ET DRAG-FILL */}
                  <td className={`px-4 py-3 relative ${isBeingFilled ? 'after:absolute after:inset-0 after:border-y-2 after:border-primary-500/50' : ''}`}>
                    <div className="status-selector flex items-center gap-1">
                      {isStatusMenuOpen ? (
                        <div className={`flex flex-col gap-1 p-1 bg-surface-950 border border-surface-800 rounded-xl shadow-2xl absolute left-0 z-50 min-w-[160px] animate-scale-in max-h-[400px] overflow-y-auto
                          ${idx < 5 ? 'top-0' : idx > prospects.length - 5 ? 'bottom-0' : 'top-1/2 -translate-y-1/2'}`}>
                          {Object.entries(STATUT_LABELS).map(([val, label]) => {
                            const colors = STATUT_COLORS[val];
                            return (
                              <button
                                key={val}
                                onClick={() => handleQuickStatusUpdate(p.id, val)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold transition-all hover:bg-surface-800
                                  ${p.statut === val ? colors.text + ' bg-surface-800/50' : 'text-surface-500'}`}
                              >
                                <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="relative group/drag">
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatusMenuId(p.id);
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer hover:scale-105 transition-all active:scale-95 group/status relative
                              ${statusColor.bg} ${statusColor.text} ${isBeingFilled ? 'ring-2 ring-primary-500' : ''}`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`} />
                            {isBeingFilled ? STATUT_LABELS[dragInfo.value] : (STATUT_LABELS[p.statut] || p.statut)}
                            <ChevronDown className="w-2.5 h-2.5 ml-0.5 opacity-50 group-hover/status:opacity-100 transition-opacity" />
                            
                            {/* Drag Handle (Excel style) */}
                            <div 
                              onMouseDown={(e) => handleStartDrag(e, idx, p.statut)}
                              className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary-500 rounded-sm cursor-ns-resize opacity-0 group-hover/drag:opacity-100 transition-opacity z-10 shadow-lg border border-white/20" 
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Note de classement (SaaS) */}
                  {isSaas && (
                    <td className="px-4 py-3">
                      <ClassementPicker
                        value={p.classement}
                        onChange={(val) => onUpdate(p.id, { classement: val })}
                      />
                    </td>
                  )}

                  {/* Effectif (SaaS) */}
                  {isSaas && (
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.effectif || ''}
                          onChange={(e) => handleChange('effectif', e.target.value)}
                          className="w-full bg-surface-950 border border-primary-500/50 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary-500"
                          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        />
                      ) : p.effectif ? (
                        <span className="text-xs font-semibold text-surface-300 whitespace-nowrap" title={p.effectif}>
                          {formatEffectif(p.effectif)} <span className="text-surface-600 font-normal">sal.</span>
                        </span>
                      ) : (
                        <span className="text-surface-700 italic text-xs">—</span>
                      )}
                    </td>
                  )}

                  {/* Marqueur AppConduc */}
                  <td className="px-4 py-3">
                    <label
                      className="inline-flex items-center gap-1.5 cursor-pointer select-none"
                      title={p.appconduc ? 'Retirer de la liste AppConduc' : 'Marquer pour AppConduc'}
                    >
                      <input
                        type="checkbox"
                        checked={!!p.appconduc}
                        onChange={(e) => onUpdate(p.id, { appconduc: e.target.checked })}
                        className="w-4 h-4 accent-violet-500 cursor-pointer"
                      />
                      {p.appconduc && <span className="text-[11px] font-bold text-violet-300">Oui</span>}
                    </label>
                  </td>

                  {/* Ville */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={editForm.departement || ''} 
                        onChange={(e) => handleChange('departement', e.target.value)}
                        className="w-full bg-surface-950 border border-primary-500/50 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 text-surface-400 text-xs font-semibold">
                        <MapPin className="w-3 h-3 opacity-40 text-primary-500" />
                        {p.departement || '—'}
                      </div>
                    )}
                  </td>

                  {/* Site Web (ou Dirigeant / Activité en SaaS) */}
                  <td className="px-4 py-3 max-w-[240px] truncate">
                    {isSaas ? (
                      isEditing ? (
                        <div className="flex flex-col gap-1">
                          <input
                            type="text"
                            placeholder="Dirigeant / décideur"
                            value={editForm.dirigeant || ''}
                            onChange={(e) => handleChange('dirigeant', e.target.value)}
                            className="w-full bg-surface-950 border border-primary-500/50 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary-500"
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                          />
                          <input
                            type="text"
                            placeholder="Activité / métier"
                            value={editForm.activite || ''}
                            onChange={(e) => handleChange('activite', e.target.value)}
                            className="w-full bg-surface-950 border border-primary-500/50 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary-500"
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs text-surface-300 font-medium truncate">
                            {p.dirigeant || <span className="text-surface-700 italic">Décideur inconnu</span>}
                          </span>
                          <span className="text-[10px] text-surface-600 truncate flex items-center gap-1.5">
                            {p.activite || '—'}
                            {p.url_fiche && (
                              <a href={p.url_fiche} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 flex items-center gap-0.5" title="Fiche entreprise">
                                <ExternalLink className="w-3 h-3" />
                                Fiche
                              </a>
                            )}
                          </span>
                        </div>
                      )
                    ) : isEditing ? (
                      <input 
                        type="text" 
                        value={editForm.url_site || ''} 
                        onChange={(e) => handleChange('url_site', e.target.value)}
                        className="w-full bg-surface-950 border border-primary-500/50 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                      />
                    ) : (
                      <a 
                        href={p.url_site} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary-400 hover:text-primary-300 hover:underline flex items-center gap-1.5 truncate text-[11px]"
                      >
                        {p.url_site ? (
                          <>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            {p.url_site.replace(/^https?:\/\/(www\.)?/, '')}
                          </>
                        ) : (
                          <span className="text-surface-700 italic">Non renseigné</span>
                        )}
                      </a>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right sticky right-0 bg-surface-950/95 backdrop-blur-md z-10 shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.5)] group-hover:bg-surface-900/90 transition-colors">
                    <div className="flex items-center justify-end gap-1.5">
                      {isEditing ? (
                        <>
                          <button 
                            onClick={handleSave}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all font-bold"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={handleCancelEdit}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all font-bold"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <Link 
                            to={`/prospect/${p.id}`}
                            className="p-1.5 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 border border-primary-500/20 transition-all opacity-0 group-hover:opacity-100"
                            title="Voir fiche client"
                          >
                            <UserSearch className="w-4 h-4" />
                          </Link>
                          <button 
                            onClick={() => handleCopyInfo(p)}
                            className={`p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 border ${
                              copiedId === p.id 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-surface-800/50 text-surface-400 hover:text-surface-200 border-surface-700/50 hover:bg-surface-800'
                            }`}
                            title="Copier les informations"
                          >
                            {copiedId === p.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(p);
                            }}
                            className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-200 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onDelete(p.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-surface-600 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Visual Indicator for dragging across the entire table */}
      {isDragging && (
        <div className="fixed inset-0 z-40 cursor-ns-resize pointer-events-none" />
      )}
    </div>
  );
}
