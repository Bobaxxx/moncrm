import { useState } from 'react';
import { X, Save, UserSearch, Phone, MapPin, Globe, User, Briefcase, FileSearch } from 'lucide-react';
import { createProspect } from '../../services/api';
import { useStatuts } from '../../contexts/useWorkspace';

const EMPTY_FORM = {
  nom_entreprise: '',
  telephone: '',
  adresse: '',
  url_site: '',
  departement: '',
  statut: 'a_contacter',
  maquette_phone: '',
  // SaaS
  dirigeant: '',
  activite: '',
  ville: '',
  code_postal: '',
  url_fiche: '',
  linkedin_url: ''
};

const SITE_WEB_FIELDS = ['nom_entreprise', 'telephone', 'adresse', 'url_site', 'departement', 'statut', 'maquette_phone'];
const SAAS_FIELDS = ['nom_entreprise', 'telephone', 'adresse', 'statut', 'dirigeant', 'activite', 'ville', 'code_postal', 'url_fiche', 'linkedin_url'];

export default function AddProspectModal({ isOpen, onClose, onRefresh }) {
  const { STATUT_LABELS, isSaas } = useStatuts();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  if (!isOpen) return null;

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {};
      (isSaas ? SAAS_FIELDS : SITE_WEB_FIELDS).forEach(f => { payload[f] = form[f]; });
      await createProspect(payload);
      onRefresh();
      onClose();
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error('Error creating prospect:', err);
      alert(err.response?.data?.error || 'Erreur lors de la création du prospect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-900 border border-surface-800 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in max-h-[95vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between p-6 border-b border-surface-800">
          <h2 className="text-xl font-bold text-surface-50 flex items-center gap-2">
            <UserSearch className="w-5 h-5 text-primary-500" />
            Nouveau Prospect{isSaas ? ' SaaS' : ''}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-800 rounded-xl transition-colors">
            <X className="w-5 h-5 text-surface-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Entreprise *</label>
            <div className="relative">
              <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-600" />
              <input
                required
                type="text"
                placeholder="Nom de la société"
                value={form.nom_entreprise}
                onChange={set('nom_entreprise')}
                className="input-field pl-10"
              />
            </div>
          </div>

          {isSaas && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Dirigeant / Décideur</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-600" />
                <input
                  type="text"
                  placeholder="Gérant, conducteur de travaux..."
                  value={form.dirigeant}
                  onChange={set('dirigeant')}
                  className="input-field pl-10"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Téléphone{isSaas ? '' : ' *'}</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-600" />
              <input
                required={!isSaas}
                type="text"
                placeholder="06 01 02..."
                value={form.telephone}
                onChange={set('telephone')}
                className="input-field pl-10"
              />
            </div>
          </div>

          {isSaas ? (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Adresse (dépôt / siège)</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-600" />
                  <input
                    type="text"
                    placeholder="12 rue des Artisans"
                    value={form.adresse}
                    onChange={set('adresse')}
                    className="input-field pl-10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">CP</label>
                  <input type="text" placeholder="43000" value={form.code_postal} onChange={set('code_postal')} className="input-field" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Ville</label>
                  <input type="text" placeholder="Le Puy-en-Velay" value={form.ville} onChange={set('ville')} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Activité</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-600" />
                    <input type="text" placeholder="Maçonnerie" value={form.activite} onChange={set('activite')} className="input-field pl-10" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Statut</label>
                  <select value={form.statut} onChange={set('statut')} className="input-field bg-surface-950">
                    {Object.entries(STATUT_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Fiche Pappers / Annuaire</label>
                <div className="relative">
                  <FileSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-600" />
                  <input type="text" placeholder="https://www.pappers.fr/entreprise/..." value={form.url_fiche} onChange={set('url_fiche')} className="input-field pl-10" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">LinkedIn</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-600" />
                  <input type="text" placeholder="https://www.linkedin.com/in/..." value={form.linkedin_url} onChange={set('linkedin_url')} className="input-field pl-10" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Ville / Dept</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-600" />
                    <input
                      type="text"
                      placeholder="Ex: Paris"
                      value={form.departement}
                      onChange={set('departement')}
                      className="input-field pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                   <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Statut</label>
                   <select
                     value={form.statut}
                     onChange={set('statut')}
                     className="input-field bg-surface-950"
                   >
                     {Object.entries(STATUT_LABELS).map(([val, label]) => (
                       <option key={val} value={val}>{label}</option>
                     ))}
                   </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Téléphone d'envoi (Message/Maquette)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-600" />
                  <input
                    type="text"
                    placeholder="Ex: iPhone 14, Tel 2..."
                    value={form.maquette_phone}
                    onChange={set('maquette_phone')}
                    className="input-field pl-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Site Web</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-600" />
                  <input
                    type="text"
                    placeholder="https://..."
                    value={form.url_site}
                    onChange={set('url_site')}
                    className="input-field pl-10"
                  />
                </div>
              </div>
            </>
          )}

          <div className="pt-4 flex gap-3">
             <button
               type="button"
               onClick={onClose}
               className="flex-1 px-4 py-2.5 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded-xl transition-all font-bold"
             >
               Annuler
             </button>
             <button
               type="submit"
               disabled={loading}
               className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl transition-all font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20 disabled:opacity-50"
             >
               <Save className="w-4 h-4" />
               {loading ? 'Création...' : 'Enregistrer'}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
