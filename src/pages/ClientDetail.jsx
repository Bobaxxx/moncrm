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
  Smartphone,
  User,
  Briefcase,
  Users,
  Hash,
  FileSearch,
  XCircle,
  Search,
  Loader2,
  Map as MapIcon
} from 'lucide-react';
import { getProspectDetail, getProspectLogs, updateProspect, deleteProspect, enrichProspectPhone } from '../services/api';

const ENRICH_MESSAGES = {
  not_found: "Aucun numéro trouvé automatiquement pour cette entreprise.",
  ambiguous: "Résultat incertain (nom ou commune différents) : numéro non enregistré, vérifie à la main.",
  duplicate_phone: "Numéro trouvé, mais il est déjà attribué à un autre prospect SaaS.",
  error: "Erreur pendant la recherche, réessaie plus tard."
};
import { getStatutConfig, SOURCE_LABELS, SOURCE_BADGE_CLASS, STATUT_APPEL_LABELS } from '../utils/constants';

// Champs éditables sur la fiche, par espace
const SITE_WEB_FIELDS = ['notes', 'maquette_phone', 'adresse', 'siren'];
const SAAS_FIELDS = [
  'notes', 'adresse', 'siren', 'telephone', 'dirigeant', 'activite', 'code_naf', 'effectif',
  'ville', 'code_postal', 'url_fiche', 'linkedin_url', 'raison_perte'
];

const FieldInput = ({ label, icon: Icon, value, onChange, placeholder, multiline = false }) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-surface-500 uppercase tracking-widest">{label}</label>
    <div className="relative group">
      <Icon className={`absolute left-4 w-4 h-4 text-surface-500 group-focus-within:text-primary-400 transition-colors ${multiline ? 'top-4' : 'top-1/2 -translate-y-1/2'}`} />
      {multiline ? (
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="input-field w-full pl-11 min-h-[80px] bg-surface-950/40 border-surface-800/60 focus:bg-surface-950 text-sm no-scrollbar py-3"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="input-field w-full pl-11 bg-surface-950/40 border-surface-800/60 focus:bg-surface-950"
        />
      )}
    </div>
  </div>
);

const LinkField = ({ label, icon: Icon, url }) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-surface-500 uppercase tracking-widest">{label}</label>
    <div className="bg-surface-950/40 rounded-xl p-4 min-h-[50px] text-surface-300 flex items-center gap-3 min-w-0">
      <Icon className="w-4 h-4 text-surface-600 flex-shrink-0" />
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="text-primary-400 hover:text-primary-300 flex items-center gap-2 truncate">
          <span className="truncate">{url}</span>
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
        </a>
      ) : (
        <span>N/A</span>
      )}
    </div>
  </div>
);

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prospect, setProspect] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [enriching, setEnriching] = useState(false);
  const [enrichMessage, setEnrichMessage] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const detailRes = await getProspectDetail(id);
      const data = detailRes.data;
      setProspect(data);
      const initial = {};
      [...new Set([...SITE_WEB_FIELDS, ...SAAS_FIELDS])].forEach(f => { initial[f] = data[f] || ''; });
      setForm(initial);

      // L'historique ne doit pas empêcher l'affichage de la fiche
      try {
        const logsRes = await getProspectLogs(id);
        setLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
      } catch (logErr) {
        console.error('Error loading logs:', logErr);
        setLogs([]);
      }
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

  const isSaas = prospect?.offre === 'saas';
  const { STATUT_LABELS, STATUT_COLORS } = getStatutConfig(prospect?.offre);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {};
      (isSaas ? SAAS_FIELDS : SITE_WEB_FIELDS).forEach(f => { updates[f] = form[f] === '' ? null : form[f]; });
      if (isSaas && updates.ville) updates.departement = updates.ville;

      await updateProspect(id, updates);
      setProspect(prev => ({ ...prev, ...updates }));

      const logsRes = await getProspectLogs(id);
      setLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
    } catch (err) {
      console.error('[ClientDetail] Error saving:', err.response?.data || err.message);
      alert("Erreur lors de l'enregistrement : " + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleEnrichPhone = async () => {
    setEnriching(true);
    setEnrichMessage(null);
    try {
      const { data } = await enrichProspectPhone(id);
      if (data.status === 'found') {
        setProspect(prev => ({ ...prev, telephone: data.telephone, url_site: data.url_site || prev.url_site, google_maps_url: data.google_maps_url || prev.google_maps_url, enrichment_status: 'found' }));
        setForm(prev => ({ ...prev, telephone: data.telephone }));
        setEnrichMessage({ ok: true, text: `Téléphone trouvé : ${data.telephone}${data.place_name ? ` (${data.place_name})` : ''}` });
        const logsRes = await getProspectLogs(id);
        setLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
      } else {
        setProspect(prev => ({ ...prev, enrichment_status: data.status, google_maps_url: data.google_maps_url || prev.google_maps_url }));
        setEnrichMessage({ ok: false, text: ENRICH_MESSAGES[data.status] || 'Numéro non trouvé.' });
      }
    } catch (err) {
      setEnrichMessage({ ok: false, text: err.response?.data?.error || 'Erreur lors de la recherche du téléphone' });
    } finally {
      setEnriching(false);
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

  const describeLog = (log) => {
    if (log.event_type === 'status_change') {
      return (
        <span>
          Statut modifié de <span className="font-bold text-surface-400">{STATUT_LABELS[log.old_value] || log.old_value || '—'}</span> à <span className="font-bold text-primary-400">{STATUT_LABELS[log.new_value] || log.new_value || '—'}</span>
        </span>
      );
    }
    if (log.event_type === 'call_status_change') {
      return (
        <span>
          Appel : <span className="font-bold text-primary-400">{STATUT_APPEL_LABELS[log.new_value] || log.new_value || '—'}</span>
        </span>
      );
    }
    if (log.event_type === 'phone_enriched') {
      return (
        <span>
          Téléphone trouvé automatiquement : <span className="font-bold text-emerald-400">{log.new_value}</span>
        </span>
      );
    }
    return <span>{log.event_type || 'Action'}: {log.new_value || '—'}</span>;
  };

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
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor.bg} ${statusColor.text} ${statusColor.border} border`}>
                {statusLabel}
              </span>
              <span className={SOURCE_BADGE_CLASS[prospect.source] || 'badge-maps'}>
                {SOURCE_LABELS[prospect.source] || prospect.source || 'Inconnu'}
              </span>
              {isSaas && (
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  SaaS
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-surface-50 tracking-tight">
              {prospect.nom_entreprise}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-surface-400">
              {prospect.dirigeant && (
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-primary-500" />
                  <span className="font-medium">{prospect.dirigeant}</span>
                </div>
              )}
              {prospect.telephone && (
                <a href={`tel:${prospect.telephone}`} className="flex items-center gap-1.5 hover:text-surface-200">
                  <Phone className="w-4 h-4 text-primary-500" />
                  <span className="font-medium">{prospect.telephone}</span>
                </a>
              )}
              {prospect.departement && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary-500" />
                  <span>{isSaas ? [prospect.code_postal, prospect.ville || prospect.departement].filter(Boolean).join(' ') : `Dép. ${prospect.departement}`}</span>
                </div>
              )}
            </div>
            {isSaas && prospect.statut === 'perdu' && prospect.raison_perte && (
              <div className="inline-flex items-center gap-2 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-1.5">
                <XCircle className="w-4 h-4" />
                Perdu : {prospect.raison_perte}
              </div>
            )}
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

            {isSaas ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FieldInput label="Dirigeant / Décideur" icon={User} value={form.dirigeant} onChange={set('dirigeant')} placeholder="Gérant, conducteur de travaux..." />
                <div className="space-y-2">
                  <FieldInput label="Téléphone" icon={Phone} value={form.telephone} onChange={set('telephone')} placeholder="06 ..." />
                  {!prospect.telephone && (
                    <button
                      type="button"
                      onClick={handleEnrichPhone}
                      disabled={enriching}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-60"
                    >
                      {enriching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      {enriching ? 'Recherche en cours…' : 'Rechercher le téléphone automatiquement'}
                    </button>
                  )}
                  {enrichMessage && (
                    <p className={`text-xs ${enrichMessage.ok ? 'text-emerald-400' : 'text-amber-400'}`} role="status">{enrichMessage.text}</p>
                  )}
                  {prospect.google_maps_url && (
                    <a href={prospect.google_maps_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300">
                      <MapIcon className="w-3.5 h-3.5" /> Voir sur Google Maps <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <FieldInput label="Adresse (dépôt / siège)" icon={MapPin} value={form.adresse} onChange={set('adresse')} placeholder="Adresse complète..." multiline />
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <FieldInput label="CP" icon={Hash} value={form.code_postal} onChange={set('code_postal')} placeholder="43000" />
                  </div>
                  <div className="col-span-2">
                    <FieldInput label="Ville" icon={MapPin} value={form.ville} onChange={set('ville')} placeholder="Ville" />
                  </div>
                </div>
                <FieldInput label="Activité / Métier" icon={Briefcase} value={form.activite} onChange={set('activite')} placeholder="Maçonnerie générale..." />
                <div className="grid grid-cols-2 gap-3">
                  <FieldInput label="Code NAF" icon={Hash} value={form.code_naf} onChange={set('code_naf')} placeholder="43.99C" />
                  <FieldInput label="Effectif" icon={Users} value={form.effectif} onChange={set('effectif')} placeholder="10-19" />
                </div>
                <FieldInput label="SIREN" icon={Building2} value={form.siren} onChange={set('siren')} placeholder="123 456 789" />
                <FieldInput label="Fiche Pappers / Annuaire (URL)" icon={FileSearch} value={form.url_fiche} onChange={set('url_fiche')} placeholder="https://www.pappers.fr/..." />
                <FieldInput label="LinkedIn (URL)" icon={User} value={form.linkedin_url} onChange={set('linkedin_url')} placeholder="https://www.linkedin.com/in/..." />
                <FieldInput label="Raison de la perte" icon={XCircle} value={form.raison_perte} onChange={set('raison_perte')} placeholder="Si perdu : trop cher, pas le temps..." />
                {(prospect.url_fiche || prospect.linkedin_url) && (
                  <div className="md:col-span-2 flex flex-wrap gap-3">
                    {prospect.url_fiche && (
                      <a href={prospect.url_fiche} target="_blank" rel="noreferrer" className="btn-ghost flex items-center gap-2 text-sm">
                        <FileSearch className="w-4 h-4" /> Ouvrir la fiche entreprise <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {prospect.linkedin_url && (
                      <a href={prospect.linkedin_url} target="_blank" rel="noreferrer" className="btn-ghost flex items-center gap-2 text-sm">
                        <User className="w-4 h-4" /> Ouvrir LinkedIn <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FieldInput label="Adresse complète (Facturation)" icon={MapPin} value={form.adresse} onChange={set('adresse')} placeholder="Entrez l'adresse complète pour les factures..." multiline />
                <FieldInput label="SIREN / SIRET" icon={Building2} value={form.siren} onChange={set('siren')} placeholder="Ex: 123 456 789 00012" />
                <LinkField label="Site Web" icon={Globe} url={prospect.url_site} />
                <FieldInput label="Téléphone utilisé (Maquette)" icon={Smartphone} value={form.maquette_phone} onChange={set('maquette_phone')} placeholder="Ex: iPhone 12 Pro..." />
              </div>
            )}
          </div>

          {/* Notes Card */}
          <div className="bg-surface-900/20 border border-surface-800/40 rounded-3xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-surface-100 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary-500" />
              Notes internes
            </h2>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              placeholder={isSaas ? "Passage au dépôt, nombre d'équipes, outil actuel..." : 'Ajouter des notes sur cet échange...'}
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

              {logs.length === 0 ? (
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
                        {describeLog(log)}
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
