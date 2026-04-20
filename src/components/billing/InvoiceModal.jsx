import { useState, useEffect } from 'react';
import { getProspects, createInvoice } from '../../services/api';
import { X, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

export default function InvoiceModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    type: 'invoice',
    client_name: '',
    client_address: '',
    client_siren: '',
    date_emission: new Date().toISOString().split('T')[0],
    date_echeance: '',
    date_prestation: '',
    prospect_id: null,
    items: [{ description: '', quantity: 1, unit_price: 0 }]
  });

  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchProspects();
    }
  }, [isOpen]);

  const fetchProspects = async () => {
    try {
      const response = await getProspects({ statut: 'client_signe' });
      setProspects(response.data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, unit_price: 0 }]
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleProspectSelect = (prospectId) => {
    const prospect = prospects.find(p => p.id.toString() === prospectId.toString());
    if (prospect) {
      setFormData({
        ...formData,
        prospect_id: prospect.id,
        client_name: prospect.nom_entreprise,
        client_address: prospect.adresse || ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await createInvoice(formData);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création du document');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalHT = formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-900 border border-surface-800 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl flex flex-col no-scrollbar">
        {/* Header */}
        <div className="p-6 border-b border-surface-800 flex items-center justify-between sticky top-0 bg-surface-900/90 backdrop-blur-md z-10">
          <div>
            <h2 className="text-xl font-bold text-white">Créer un nouveau document</h2>
            <p className="text-sm text-surface-500">Gérez vos devis et factures</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface-800 text-surface-500 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Type & Client Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary-500">Type & Client</h3>
              
              <div>
                <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-wider mb-2">Type de document</label>
                <div className="flex gap-4">
                  {['invoice', 'quote'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: t })}
                      className={`flex-1 py-3 px-4 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all ${
                        formData.type === t 
                          ? 'bg-primary-500/10 border-primary-500 text-primary-400 shadow-lg shadow-primary-500/10' 
                          : 'bg-surface-950/50 border-surface-800 text-surface-500 hover:border-surface-700'
                      }`}
                    >
                      {t === 'invoice' ? 'Facture' : 'Devis'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-wider mb-2">Associer à un client</label>
                <select 
                  className="w-full bg-surface-950/50 border border-surface-800 rounded-xl p-3 text-sm focus:border-primary-500/50 outline-none"
                  onChange={(e) => handleProspectSelect(e.target.value)}
                  value={formData.prospect_id || ''}
                >
                  <option value="">-- Sélectionner un client (optionnel) --</option>
                  {prospects.map(p => (
                    <option key={p.id} value={p.id}>{p.nom_entreprise}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-wider mb-2">Nom / Entreprise client *</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-surface-950/50 border border-surface-800 rounded-xl p-3 text-sm focus:border-primary-500/50 outline-none"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-wider mb-2">SIREN client</label>
                <input 
                  type="text" 
                  className="w-full bg-surface-950/50 border border-surface-800 rounded-xl p-3 text-sm focus:border-primary-500/50 outline-none"
                  value={formData.client_siren}
                  onChange={(e) => setFormData({ ...formData, client_siren: e.target.value })}
                  placeholder="Ex: 123 456 789"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-wider mb-2">Adresse client</label>
                <textarea 
                  className="w-full bg-surface-950/50 border border-surface-800 rounded-xl p-3 text-sm focus:border-primary-500/50 outline-none h-24 no-scrollbar"
                  value={formData.client_address}
                  onChange={(e) => setFormData({ ...formData, client_address: e.target.value })}
                ></textarea>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary-500">Dates</h3>
              
              <div>
                <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-wider mb-2">Date d'émission</label>
                <input 
                  type="date"
                  required
                  className="w-full bg-surface-950/50 border border-surface-800 rounded-xl p-3 text-sm focus:border-primary-500/50 outline-none"
                  value={formData.date_emission}
                  onChange={(e) => setFormData({ ...formData, date_emission: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-surface-500 uppercase tracking-wider mb-2">Date d'échéance</label>
                <input 
                  type="date"
                  className="w-full bg-surface-950/50 border border-surface-800 rounded-xl p-3 text-sm focus:border-primary-500/50 outline-none"
                  value={formData.date_echeance}
                  onChange={(e) => setFormData({ ...formData, date_echeance: e.target.value })}
                />
              </div>

              <div className="p-6 rounded-2xl bg-surface-950/50 border border-surface-800/50 space-y-4 mt-8">
                <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500">Mentions Légales (Automatiques)</p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-xs text-surface-400">
                    <CheckCircle className="w-3 h-3 text-green-500" /> Jules Marcon EI
                  </li>
                  <li className="flex items-center gap-2 text-xs text-surface-400">
                    <CheckCircle className="w-3 h-3 text-green-500" /> TVA non applicable, art. 293 B du CGI
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-4 pt-4 border-t border-surface-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary-500">Prestations</h3>
              <button 
                type="button" 
                onClick={handleAddItem}
                className="flex items-center gap-2 text-xs font-bold text-primary-400 hover:text-primary-300 transition-colors uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" /> Ajouter une ligne
              </button>
            </div>

            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="flex flex-col md:flex-row gap-4 bg-surface-950/30 p-4 rounded-2xl border border-surface-800/50 animate-slide-in-bottom">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-surface-600 uppercase mb-1">Désignation</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Description de la prestation..."
                      className="w-full bg-surface-950/50 border border-surface-800 rounded-xl p-2 text-sm focus:border-primary-500/50 outline-none"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    />
                  </div>
                  <div className="w-full md:w-24">
                    <label className="block text-[10px] font-bold text-surface-600 uppercase mb-1">Qté</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      className="w-full bg-surface-950/50 border border-surface-800 rounded-xl p-2 text-sm focus:border-primary-500/50 outline-none"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="w-full md:w-32">
                    <label className="block text-[10px] font-bold text-surface-600 uppercase mb-1">Prix HT (€)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      className="w-full bg-surface-950/50 border border-surface-800 rounded-xl p-2 text-sm focus:border-primary-500/50 outline-none"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="w-full md:w-32 flex flex-col justify-end">
                    <label className="block text-[10px] font-bold text-surface-600 uppercase mb-1">Total HT</label>
                    <div className="p-2 text-sm font-bold text-white text-right">
                      {(item.quantity * item.unit_price).toFixed(2)} €
                    </div>
                  </div>
                  {formData.items.length > 1 && (
                    <div className="flex items-end pb-2">
                      <button 
                        type="button" 
                        onClick={() => handleRemoveItem(index)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer / Total */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pt-8 border-t border-surface-800">
            <div className="max-w-md">
              <p className="text-xs text-surface-500 italic">
                Note : Pour une micro-entreprise, le Total HT est égal au Total TTC (TVA non applicable).
              </p>
            </div>
            <div className="glass-card p-6 border-primary-500/20 bg-primary-500/5 min-w-[300px]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-surface-500">Total HT</span>
                <span className="text-lg font-bold text-white">{totalHT.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-surface-500">TVA (0%)</span>
                <span className="text-sm font-semibold text-surface-400">0,00 €</span>
              </div>
              <div className="h-px bg-surface-800 mb-4" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold uppercase tracking-widest text-primary-400">Total TTC</span>
                <span className="text-3xl font-black text-white">{totalHT.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="px-8 py-3 rounded-2xl bg-surface-800 text-surface-200 font-bold uppercase tracking-wider text-xs hover:bg-surface-700 transition-all"
            >
              Annuler
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="btn-primary px-10 py-3 rounded-2xl font-bold uppercase tracking-wider text-xs shadow-xl shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Génération en cours...' : 'Générer le PDF'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
