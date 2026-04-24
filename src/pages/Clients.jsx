import { useState, useEffect } from 'react';
import {
  Star, Euro, Calendar, CheckCircle2, Clock, AlertCircle,
  TrendingUp, Plus, X, Save, Phone, Globe, MapPin, Edit3,
  FileText, Banknote, ChevronDown
} from 'lucide-react';
import { getProspects, updateProspect } from '../services/api';

const STATUT_FACTURATION = [
  { value: 'a_envoyer', label: 'À envoyer', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400' },
  { value: 'envoyee', label: 'Envoyée', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', dot: 'bg-blue-400' },
  { value: 'payee', label: 'Payée ✓', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
];

function EditModal({ client, onClose, onSave }) {
  const [form, setForm] = useState({
    montant_contrat: client.montant_contrat || '',
    montant_mensuel: client.montant_mensuel || '',
    contrat_type: client.contrat_type || 'achat',
    has_maintenance: client.has_maintenance || false,
    date_prochaine_facture: client.date_prochaine_facture || '',
    statut_facturation: client.statut_facturation || 'a_envoyer',
    notes_client: client.notes_client || '',
    siren: client.siren || '',
    adresse: client.adresse || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProspect(client.id, {
        montant_contrat: form.montant_contrat ? parseFloat(form.montant_contrat) : null,
        montant_mensuel: form.montant_mensuel ? parseFloat(form.montant_mensuel) : null,
        contrat_type: form.contrat_type,
        has_maintenance: form.has_maintenance,
        date_prochaine_facture: form.date_prochaine_facture || null,
        statut_facturation: form.statut_facturation,
        notes_client: form.notes_client,
        siren: form.siren,
        adresse: form.adresse,
      });
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-lg shadow-[0_0_60px_rgba(0,0,0,0.5)] border-surface-700/50">
        {/* Header */}
        <div className="p-6 border-b border-surface-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-surface-50">Modifier le client</h2>
              <p className="text-xs text-surface-500 truncate max-w-[220px]">{client.nom_entreprise}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-800 rounded-lg text-surface-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          {/* Type de Contrat */}
          <div>
            <label className="text-[10px] uppercase font-bold text-surface-500 tracking-widest mb-2 block">
              Type de contrat
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setForm(f => ({ ...f, contrat_type: 'achat' }))}
                className={`flex-1 p-3 rounded-xl border text-xs font-bold transition-all ${
                  form.contrat_type === 'achat'
                    ? 'bg-primary-500/10 border-primary-500 text-primary-400'
                    : 'bg-surface-900/40 border-surface-800/40 text-surface-500'
                }`}
              >
                Achat Unique
              </button>
              <button
                onClick={() => setForm(f => ({ ...f, contrat_type: 'abonnement', montant_mensuel: 89 }))}
                className={`flex-1 p-3 rounded-xl border text-xs font-bold transition-all ${
                  form.contrat_type === 'abonnement'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                    : 'bg-surface-900/40 border-surface-800/40 text-surface-500'
                }`}
              >
                Abonnement Mensuel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Montant Achat */}
            <div>
              <label className="text-[10px] uppercase font-bold text-surface-500 tracking-widest mb-2 block">
                Prix Achat Site (€)
              </label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                <input
                  type="number"
                  placeholder="Ex: 1200"
                  value={form.montant_contrat}
                  onChange={e => setForm(f => ({ ...f, montant_contrat: e.target.value }))}
                  className="input-field pl-9 w-full"
                />
              </div>
            </div>

            {/* Montant Mensuel */}
            <div className={`${form.contrat_type !== 'abonnement' ? 'opacity-50 grayscale' : ''}`}>
              <label className="text-[10px] uppercase font-bold text-surface-500 tracking-widest mb-2 block">
                Mensuel (€/mois)
              </label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                <input
                  type="number"
                  placeholder="Ex: 89"
                  disabled={form.contrat_type !== 'abonnement'}
                  value={form.montant_mensuel}
                  onChange={e => setForm(f => ({ ...f, montant_mensuel: e.target.value }))}
                  className="input-field pl-9 w-full"
                />
              </div>
            </div>
          </div>

          {/* Maintenance */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-900/40 border border-surface-800/40">
            <div>
              <p className="text-xs font-bold text-surface-50">Maintenance maintenance facultative</p>
              <p className="text-[10px] text-surface-500">Inclure le suivi mensuel</p>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, has_maintenance: !f.has_maintenance }))}
              className={`w-12 h-6 rounded-full transition-all relative ${
                form.has_maintenance ? 'bg-emerald-500' : 'bg-surface-800'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                form.has_maintenance ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>

          {/* Date facture */}
          <div>
            <label className="text-[10px] uppercase font-bold text-surface-500 tracking-widest mb-2 block">
              Prochaine facture à envoyer
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
              <input
                type="date"
                value={form.date_prochaine_facture}
                onChange={e => setForm(f => ({ ...f, date_prochaine_facture: e.target.value }))}
                className="input-field pl-9 w-full"
              />
            </div>
          </div>

          {/* Statut facturation */}
          <div>
            <label className="text-[10px] uppercase font-bold text-surface-500 tracking-widest mb-2 block">
              Statut de la facture
            </label>
            <div className="grid grid-cols-3 gap-2">
              {STATUT_FACTURATION.map(s => (
                <button
                  key={s.value}
                  onClick={() => setForm(f => ({ ...f, statut_facturation: s.value }))}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                    form.statut_facturation === s.value
                      ? `${s.bg} ${s.color} scale-[1.02]`
                      : 'bg-surface-900/40 border-surface-800/40 text-surface-500 hover:bg-surface-800/40'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-surface-500 tracking-widest mb-2 block">
                SIREN / SIRET
              </label>
              <input
                type="text"
                placeholder="Ex: 123 456 789"
                value={form.siren}
                onChange={e => setForm(f => ({ ...f, siren: e.target.value }))}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-surface-500 tracking-widest mb-2 block">
                Adresse de facturation
              </label>
              <textarea
                rows={1}
                placeholder="Adresse complète..."
                value={form.adresse}
                onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
                className="input-field w-full resize-none py-2"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] uppercase font-bold text-surface-500 tracking-widest mb-2 block">
              Notes internes
            </label>
            <textarea
              rows={3}
              placeholder="Infos utiles sur ce client..."
              value={form.notes_client}
              onChange={e => setForm(f => ({ ...f, notes_client: e.target.value }))}
              className="input-field w-full resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-surface-800 flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn-ghost py-2 text-sm">Annuler</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary py-2 px-6 text-sm flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Sauvegarde...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingClient, setEditingClient] = useState(null);
  const [filterFacturation, setFilterFacturation] = useState('all');

  const loadClients = async () => {
    try {
      const res = await getProspects({ statut: 'client_signe', nopagination: true });
      setClients(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClients(); }, []);

  const totalCA = clients.reduce((sum, c) => sum + (parseFloat(c.montant_contrat) || 0), 0);
  const totalMRR = clients.filter(c => c.contrat_type === 'abonnement').reduce((sum, c) => sum + (parseFloat(c.montant_mensuel) || 0), 0);
  const totalPaye = clients.filter(c => c.statut_facturation === 'payee').reduce((sum, c) => sum + (parseFloat(c.montant_contrat) || 0), 0);
  const facturesUrgentes = clients.filter(c => {
    if (!c.date_prochaine_facture || c.statut_facturation === 'payee') return false;
    const diff = (new Date(c.date_prochaine_facture) - new Date()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  });

  const filteredClients = filterFacturation === 'all'
    ? clients
    : clients.filter(c => (c.statut_facturation || 'a_envoyer') === filterFacturation);

  const getFacturationInfo = (statut) =>
    STATUT_FACTURATION.find(s => s.value === statut) || STATUT_FACTURATION[0];

  const getDaysUntilInvoice = (date) => {
    if (!date) return null;
    const diff = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-50 flex items-center gap-3">
            <Star className="w-8 h-8 text-emerald-400 fill-emerald-400/30" />
            Clients Signés
          </h1>
          <p className="text-surface-500 mt-2">Suivi de tes contrats et facturation</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase font-bold text-surface-600 tracking-widest">{clients.length} client{clients.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* CA Total */}
        <div className="glass-card p-6 border-emerald-500/10 bg-emerald-500/[0.03]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Euro className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-[10px] uppercase font-bold text-emerald-500/60 tracking-widest">CA Total</p>
          </div>
          <p className="text-3xl font-bold text-emerald-400">
            {totalCA.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} €
          </p>
          <p className="text-xs text-surface-600 mt-1">Contrats signés</p>
        </div>

        {/* CA Encaissé */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-400" />
            </div>
            <p className="text-[10px] uppercase font-bold text-surface-500 tracking-widest">MRR (Mensuel)</p>
          </div>
          <p className="text-3xl font-bold text-surface-50">
            {totalMRR.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} €
          </p>
          <p className="text-xs text-surface-600 mt-1">Revenu Récurrent</p>
        </div>

        {/* En attente */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-[10px] uppercase font-bold text-surface-500 tracking-widest">Abonnés</p>
          </div>
          <p className="text-3xl font-bold text-surface-50">
            {clients.filter(c => c.contrat_type === 'abonnement').length}
          </p>
          <p className="text-xs text-surface-600 mt-1">Clients actifs mensuels</p>
        </div>

        {/* Factures urgentes */}
        <div className={`glass-card p-6 ${facturesUrgentes.length > 0 ? 'border-red-500/20 bg-red-500/[0.03]' : ''}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${facturesUrgentes.length > 0 ? 'bg-red-500/20' : 'bg-surface-800/50'}`}>
              <AlertCircle className={`w-5 h-5 ${facturesUrgentes.length > 0 ? 'text-red-400' : 'text-surface-600'}`} />
            </div>
            <p className="text-[10px] uppercase font-bold text-surface-500 tracking-widest">Urgentes</p>
          </div>
          <p className={`text-3xl font-bold ${facturesUrgentes.length > 0 ? 'text-red-400' : 'text-surface-50'}`}>
            {facturesUrgentes.length}
          </p>
          <p className="text-xs text-surface-600 mt-1">Factures à envoyer dans 7j</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {['all', 'a_envoyer', 'envoyee', 'payee'].map(f => {
          const info = f === 'all' ? null : getFacturationInfo(f);
          return (
            <button
              key={f}
              onClick={() => setFilterFacturation(f)}
              className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                filterFacturation === f
                  ? (info ? `${info.bg} ${info.color}` : 'bg-primary-500/10 border-primary-500/30 text-primary-400')
                  : 'bg-surface-900/40 border-surface-800/40 text-surface-500 hover:text-surface-300'
              }`}
            >
              {f === 'all' ? `Tous (${clients.length})` : `${info.label} (${clients.filter(c => (c.statut_facturation || 'a_envoyer') === f).length})`}
            </button>
          );
        })}
      </div>

      {/* Client List */}
      {filteredClients.length === 0 ? (
        <div className="glass-card p-16 text-center border-surface-800/40">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-emerald-500/40" />
          </div>
          <h3 className="text-lg font-bold text-surface-400 mb-2">Aucun client signé</h3>
          <p className="text-sm text-surface-600">Passe un prospect au statut "Client signé" dans le pipeline</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClients.map(client => {
            const factuInfo = getFacturationInfo(client.statut_facturation || 'a_envoyer');
            const daysLeft = getDaysUntilInvoice(client.date_prochaine_facture);
            const isUrgent = daysLeft !== null && daysLeft <= 7 && client.statut_facturation !== 'payee';
            const isOverdue = daysLeft !== null && daysLeft < 0 && client.statut_facturation !== 'payee';

            return (
              <div
                key={client.id}
                className={`glass-card p-5 flex items-center gap-5 transition-all hover:border-surface-700/60 group ${
                  isOverdue ? 'border-red-500/30 bg-red-500/[0.02]' : isUrgent ? 'border-amber-500/20' : 'border-surface-800/40'
                }`}
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Star className="w-6 h-6 text-emerald-400 fill-emerald-400/30" />
                </div>

                {/* Info principale */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-surface-100 truncate">{client.nom_entreprise}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-surface-500">
                    {client.telephone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {client.telephone}
                      </span>
                    )}
                    {client.departement && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {client.departement}
                      </span>
                    )}
                    {client.url_site && (
                      <a
                        href={client.url_site.startsWith('http') ? client.url_site : `https://${client.url_site}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-primary-400 transition-colors"
                        onClick={e => e.stopPropagation()}
                      >
                        <Globe className="w-3 h-3" /> Site web
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {client.contrat_type === 'abonnement' ? (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black uppercase tracking-widest">
                        Abonnement {client.montant_mensuel}€/mois
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg bg-primary-500/10 text-primary-400 border border-primary-500/20 text-[9px] font-black uppercase tracking-widest">
                        Achat Unique
                      </span>
                    )}
                    {client.has_maintenance && (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Maintenance OK
                      </span>
                    )}
                  </div>
                </div>

                {/* Montant */}
                <div className="text-right flex-shrink-0 w-28">
                  {client.montant_contrat ? (
                    <>
                      <p className="text-xl font-bold text-emerald-400">
                        {parseFloat(client.montant_contrat).toLocaleString('fr-FR')} €
                      </p>
                      <p className="text-[10px] text-surface-600 uppercase tracking-wider">Contrat</p>
                    </>
                  ) : (
                    <p className="text-sm text-surface-700 italic">Montant non défini</p>
                  )}
                </div>

                {/* Prochaine facture */}
                <div className="flex-shrink-0 w-40 text-right">
                  {client.date_prochaine_facture ? (
                    <>
                      <p className={`text-sm font-bold ${isOverdue ? 'text-red-400' : isUrgent ? 'text-amber-400' : 'text-surface-300'}`}>
                        {new Date(client.date_prochaine_facture).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      <p className={`text-[10px] uppercase font-bold tracking-wider mt-0.5 ${
                        isOverdue ? 'text-red-500' : isUrgent ? 'text-amber-500' : 'text-surface-600'
                      }`}>
                        {isOverdue ? `${Math.abs(daysLeft)}j de retard` : daysLeft === 0 ? "Aujourd'hui !" : `dans ${daysLeft}j`}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-surface-700 italic">Pas de date</p>
                  )}
                </div>

                {/* Badge facturation */}
                <div className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${factuInfo.bg} ${factuInfo.color}`}>
                  {factuInfo.label}
                </div>

                {/* Edit button */}
                <button
                  onClick={() => setEditingClient(client)}
                  className="p-2.5 rounded-xl bg-surface-800/0 hover:bg-surface-800/60 border border-surface-800/0 hover:border-surface-700/50 text-surface-600 hover:text-surface-200 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingClient && (
        <EditModal
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSave={loadClients}
        />
      )}
    </div>
  );
}
