import { useState } from 'react';
import { X, Save, UserSearch, Phone, MapPin, Globe } from 'lucide-react';
import { createProspect } from '../../services/api';
import { STATUT_LABELS } from '../../utils/constants';

export default function AddProspectModal({ isOpen, onClose, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nom_entreprise: '',
    telephone: '',
    adresse: '',
    url_site: '',
    departement: '',
    statut: 'a_contacter',
    maquette_phone: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createProspect(form);
      onRefresh();
      onClose();
      // Reset form
      setForm({
        nom_entreprise: '',
        telephone: '',
        adresse: '',
        url_site: '',
        departement: '',
        statut: 'a_contacter',
        maquette_phone: ''
      });
    } catch (err) {
      console.error('Error creating prospect:', err);
      alert('Erreur lors de la création du prospect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-900 border border-surface-800 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-surface-800">
          <h2 className="text-xl font-bold text-surface-50 flex items-center gap-2">
            <UserSearch className="w-5 h-5 text-primary-500" />
            Nouveau Prospect
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
                onChange={(e) => setForm({ ...form, nom_entreprise: e.target.value })}
                className="input-field pl-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Téléphone *</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-600" />
              <input
                required
                type="text"
                placeholder="06 01 02..."
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                className="input-field pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Ville / Dept</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-600" />
                <input
                  type="text"
                  placeholder="Ex: Paris"
                  value={form.departement}
                  onChange={(e) => setForm({ ...form, departement: e.target.value })}
                  className="input-field pl-10"
                />
              </div>
            </div>
            <div className="space-y-1.5">
               <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Statut</label>
               <select
                 value={form.statut}
                 onChange={(e) => setForm({ ...form, statut: e.target.value })}
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
                onChange={(e) => setForm({ ...form, maquette_phone: e.target.value })}
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
                onChange={(e) => setForm({ ...form, url_site: e.target.value })}
                className="input-field pl-10"
              />
            </div>
          </div>

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
