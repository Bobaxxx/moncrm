import { useState } from 'react';
import { Phone, MapPin, Globe, MessageSquare, GripVertical, ExternalLink, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { SOURCE_LABELS, SOURCE_BADGE_CLASS } from '../../utils/constants';
import { generateSmsLink, deleteProspect } from '../../services/api';

export default function ProspectCard({ prospect, onUpdate, onDelete, isDragging }) {
  const [expanded, setExpanded] = useState(false);
  const [smsData, setSmsData] = useState(null);
  const [loadingSms, setLoadingSms] = useState(false);

  const handleSmsGenerate = async (e) => {
    e.stopPropagation();
    setLoadingSms(true);
    try {
      const res = await generateSmsLink(prospect.id);
      setSmsData(res.data);
      window.open(res.data.smsLink, '_blank');
    } catch (err) {
      console.error('SMS error:', err);
    } finally {
      setLoadingSms(false);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm(`Supprimer ${prospect.nom_entreprise} ?`)) return;
    try {
      await deleteProspect(prospect.id);
      onDelete?.(prospect.id);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div
      className={`bg-surface-800/50 border border-surface-700/40 rounded-xl p-3.5 transition-all duration-200
        ${isDragging ? 'shadow-2xl shadow-primary-500/10 border-primary-500/30 rotate-[2deg] scale-105' : 'hover:border-surface-600/60'}
      `}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <div className="mt-0.5 cursor-grab text-surface-700 hover:text-surface-500 transition-colors">
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-surface-100 truncate">
            {prospect.nom_entreprise}
          </h4>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={SOURCE_BADGE_CLASS[prospect.source] || 'badge-maps'}>
              {SOURCE_LABELS[prospect.source] || prospect.source}
            </span>
            {prospect.departement && (
              <span className="text-[10px] text-surface-500 flex items-center gap-0.5">
                <MapPin className="w-3 h-3" />
                {prospect.departement}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-6 h-6 rounded-lg hover:bg-surface-700/50 flex items-center justify-center text-surface-500 hover:text-surface-300 transition-all"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Phone */}
      {prospect.telephone && (
        <div className="flex items-center gap-1.5 mt-2.5 text-xs text-surface-400">
          <Phone className="w-3 h-3 text-surface-600" />
          <span>{prospect.telephone}</span>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-surface-800/60 space-y-2 animate-fade-in">
          {prospect.adresse && (
            <div className="flex items-start gap-1.5 text-xs text-surface-400">
              <MapPin className="w-3 h-3 text-surface-600 mt-0.5 flex-shrink-0" />
              <span>{prospect.adresse}</span>
            </div>
          )}
          {prospect.url_site && (
            <div className="flex items-center gap-1.5 text-xs">
              <Globe className="w-3 h-3 text-surface-600" />
              <a href={prospect.url_site} target="_blank" rel="noreferrer" className="text-primary-400 hover:text-primary-300 truncate">
                {prospect.url_site}
              </a>
              <ExternalLink className="w-3 h-3 text-surface-600" />
            </div>
          )}
          {prospect.notes && (
            <p className="text-xs text-surface-500 italic bg-surface-900/40 rounded-lg px-3 py-2">
              {prospect.notes}
            </p>
          )}
          <p className="text-[10px] text-surface-600">
            Ajouté le {new Date(prospect.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-surface-800/40">
        {prospect.statut === 'a_contacter' && (
          <button
            onClick={handleSmsGenerate}
            disabled={loadingSms}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              bg-primary-600/15 text-primary-400 hover:bg-primary-600/25 border border-primary-500/20 transition-all"
            id={`sms-btn-${prospect.id}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {loadingSms ? '...' : 'SMS'}
          </button>
        )}
        <a
          href={`tel:${prospect.telephone}`}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
            bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 transition-all"
        >
          <Phone className="w-3.5 h-3.5" />
          Appeler
        </a>
        <button
          onClick={handleDelete}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
