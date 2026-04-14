import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Phone, 
  MapPin, 
  Globe, 
  MessageSquare, 
  ArrowLeft, 
  Save, 
  Trash2, 
  Clock, 
  Tag, 
  Building2, 
  ExternalLink,
  Smartphone
} from 'lucide-react';
import { getProspectDetail, getProspectLogs, updateProspect, deleteProspect, generateSmsLink } from '../services/api';
import { STATUT_LABELS, STATUT_COLORS, SOURCE_LABELS, SOURCE_BADGE_CLASS } from '../utils/constants';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prospect, setProspect] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [maquettePhone, setMaquettePhone] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [detailRes, logsRes] = await Promise.all([
        getProspectDetail(id),
        getProspectLogs(id)
      ]);
      setProspect(detailRes.data);
      setLogs(logsRes.data);
      setNotes(detailRes.data.notes || '');
      setMaquettePhone(detailRes.data.maquette_phone || '');
    } catch (err) {
      console.error('Error loading client detail:', err);
      setProspect(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProspect(id, { notes, maquette_phone: maquettePhone });
      setProspect(prev => ({ ...prev, notes, maquette_phone: maquettePhone }));
      // Reload logs to see the change if it was logged
      const logsRes = await getProspectLogs(id);
      setLogs(logsRes.data);
    } catch (err) {
      console.error('Error saving:', err);
      // Fallback: Si maquette_phone n'existe pas dans la DB, on n'update que notes
      try {
         await updateProspect(id, { notes });
         setProspect(prev => ({ ...prev, notes }));
      } catch (e2) {
         console.error('Fallback save failed:', e2);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Supprimer définitivement ${prospect.nom_entreprise} ?`)) return;
    try {
      await deleteProspect(id);
      navigate('/database');
    } catch (err) {
      console.error('Delete error:', err);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="text-center py-20">
        <p className="text-surface-400">Prospect introuvable</p>
        <Link to="/database" className="text-primary-400 hover:underline mt-4 inline-block">Retour à la base</Link>
      </div>
    );
  }

  const statusColor = (prospect?.statut && STATUT_COLORS[prospect.statut]) || { bg: 'bg-surface-800', text: 'text-surface-400', border: 'border-surface-700' };
  const statusLabel = (prospect?.statut && STATUT_LABELS[prospect.statut]) || prospect?.statut || 'Inconnu';

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-surface-400 hover:text-surface-200 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Retour</span>
        </button>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleDelete}
            className="btn-ghost text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Supprimer
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2 shadow-lg shadow-primary-500/20"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* Hero Header */}
      <div className="bg-surface-900/40 border border-surface-800/60 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
          <Building2 className="w-32 h-32" />
        </div>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor.bg} ${statusColor.text} ${statusColor.border} border`}>
                {statusLabel}
              </span>
              <span className={SOURCE_BADGE_CLASS[prospect.source] || 'badge-maps'}>
                {SOURCE_LABELS[prospect.source] || prospect.source || 'Inconnu'}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-surface-50 tracking-tight">
              {prospect.nom_entreprise}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-surface-400">
              <div className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-primary-500" />
                <span className="font-medium">{prospect.telephone}</span>
              </div>
              {prospect.departement && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary-500" />
                  <span>Dép. {prospect.departement}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details & Notes */}
        <div className="lg:col-span-2 space-y-8">
          {/* Details Card */}
          <div className="bg-surface-900/20 border border-surface-800/40 rounded-3xl p-6 space-y-6">
            <h2 className="text-xl font-bold text-surface-100 flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary-500" />
              Informations détaillées
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-widest">Adresse complète</label>
                <div className="bg-surface-950/40 rounded-xl p-4 min-h-[50px] text-surface-300 flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-surface-600 mt-1" />
                  <span>{prospect.adresse || 'N/A'}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-widest">Site Web</label>
                <div className="bg-surface-950/40 rounded-xl p-4 min-h-[50px] text-surface-300 flex items-center gap-3">
                  <Globe className="w-4 h-4 text-surface-600" />
                  {prospect.url_site ? (
                    <a href={prospect.url_site} target="_blank" rel="noreferrer" className="text-primary-400 hover:text-primary-300 flex items-center gap-2">
                      {prospect.url_site}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span>N/A</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-widest">Téléphone utilisé (Maquette)</label>
                <div className="relative group">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 group-focus-within:text-primary-400 transition-colors" />
                  <input 
                    type="text"
                    value={maquettePhone}
                    onChange={(e) => setMaquettePhone(e.target.value)}
                    placeholder="Ex: iPhone 12 Pro..."
                    className="input-field w-full pl-11 bg-surface-950/40 border-surface-800/60 focus:bg-surface-950"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notes Card */}
          <div className="bg-surface-900/20 border border-surface-800/40 rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-surface-100 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary-500" />
              Notes internes
            </h2>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajouter des notes sur cet échange..."
              className="input-field w-full min-h-[200px] bg-surface-950/40 border-surface-800/60 p-4 focus:bg-surface-950 text-surface-300"
            />
          </div>
        </div>

        {/* Right Column: History */}
        <div className="space-y-6">
          <div className="bg-surface-900/20 border border-surface-800/40 rounded-3xl p-6 min-h-[500px] flex flex-col">
            <h2 className="text-xl font-bold text-surface-100 flex items-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-primary-500" />
              Historique
            </h2>
            
            <div className="space-y-6 overflow-y-auto pr-2 relative flex-1 no-scrollbar">
              <div className="absolute left-4 top-2 bottom-2 w-[2px] bg-surface-800/60" />
              
              {(!logs || !Array.isArray(logs) || logs.length === 0) ? (
                <div className="text-center py-10 text-surface-600 italic">
                  Aucun historique disponible
                </div>
              ) : (
                logs.filter(Boolean).map((log, i) => (
                  <div key={log.id || i} className="relative pl-10 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-surface-700 border-2 border-surface-900 z-10" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">
                        {log.created_at ? new Date(log.created_at).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Date inconnue'}
                      </p>
                      <div className="text-xs text-surface-300">
                        {log.event_type === 'status_change' ? (
                          <span>
                            Statut modifié de <span className="font-bold text-surface-400">{STATUT_LABELS[log.old_value] || log.old_value || '—'}</span> à <span className="font-bold text-primary-400">{STATUT_LABELS[log.new_value] || log.new_value || '—'}</span>
                          </span>
                        ) : (
                          <span>{log.event_type || 'Action'}: {log.new_value || '—'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {/* Added Event */}
              {prospect?.created_at && (
                <div className="relative pl-10 opacity-50">
                  <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-primary-900 border-2 border-surface-900 z-10" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">
                      {new Date(prospect.created_at).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: 'short'
                      })}
                    </p>
                    <div className="text-xs">
                      Prospect ajouté à la base
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
