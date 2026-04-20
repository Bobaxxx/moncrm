import { useState, useEffect } from 'react';
import { getInvoices, updateInvoiceStatus } from '../services/api';
import { 
  Plus, 
  FileText, 
  Download, 
  CheckCircle, 
  Mail, 
  Search, 
  Filter,
  MoreVertical,
  Clock,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import InvoiceModal from '../components/billing/InvoiceModal';

export default function Facturation() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatut !== 'all') params.status = filterStatut;
      if (filterType !== 'all') params.type = filterType;
      
      const response = await getInvoices(params);
      setInvoices(response.data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [filterStatut, filterType]);

  const handleMarkAsPaid = async (id) => {
    try {
      await updateInvoiceStatus(id, 'payee');
      fetchInvoices();
    } catch (error) {
      console.error('Error marking as paid:', error);
    }
  };

  const handleSendEmail = (invoice) => {
    // Simulation d'envoi d'email
    alert(`Simulation d'envoi d'email pour la ${invoice.type === 'quote' ? 'devis' : 'facture'} ${invoice.number} à ${invoice.client_name}`);
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'payee':
        return <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold uppercase flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Payée</span>;
      case 'en_attente':
        return <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> En attente</span>;
      case 'en_retard':
        return <span className="px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] font-bold uppercase flex items-center gap-1"><AlertCircle className="w-3 h-3" /> En retard</span>;
      case 'a_envoyer':
        return <span className="px-2 py-1 rounded-full bg-surface-700/50 text-surface-400 text-[10px] font-bold uppercase flex items-center gap-1"><Mail className="w-3 h-3" /> À envoyer</span>;
      case 'devis_accepte':
        return <span className="px-2 py-1 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase flex items-center gap-1"><FileCheck className="w-3 h-3" /> Devis Accepté</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-surface-800 text-surface-500 text-[10px] font-bold uppercase">{status}</span>;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Facturation</h1>
          <p className="text-surface-400 mt-1">Gérez vos devis et factures conformes</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setSelectedInvoice(null); setShowModal(true); }}
            className="btn-primary rounded-2xl px-6 py-3 flex items-center gap-2 shadow-lg shadow-primary-500/20"
          >
            <Plus className="w-5 h-5" />
            <span className="font-bold uppercase tracking-wider text-xs">Créer un document</span>
          </button>
        </div>
      </div>

      {/* Stats Cards (Optional) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-surface-800/50 bg-surface-900/20">
          <p className="text-surface-500 text-xs font-bold uppercase tracking-widest mb-1">Total HT Facturé</p>
          <p className="text-2xl font-bold text-white">
            {invoices.filter(i => i.type === 'invoice').reduce((acc, current) => acc + parseFloat(current.total_ht), 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
          </p>
        </div>
        <div className="glass-card p-6 border-surface-800/50 bg-surface-900/20">
          <p className="text-surface-500 text-xs font-bold uppercase tracking-widest mb-1">En attente de paiement</p>
          <p className="text-2xl font-bold text-blue-400">
            {invoices.filter(i => i.status === 'en_attente').reduce((acc, current) => acc + parseFloat(current.total_ht), 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
          </p>
        </div>
        <div className="glass-card p-6 border-surface-800/50 bg-surface-900/20">
          <p className="text-surface-500 text-xs font-bold uppercase tracking-widest mb-1">Devis à valider</p>
          <p className="text-2xl font-bold text-purple-400">
            {invoices.filter(i => i.type === 'quote' && i.status === 'a_envoyer').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 border-surface-800/50 bg-surface-900/20 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input 
            type="text" 
            placeholder="Rechercher une facture ou un client..."
            className="w-full bg-surface-950/50 border border-surface-800 rounded-xl py-2 pl-12 pr-4 text-sm focus:border-primary-500/50 outline-none transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-surface-500" />
          <select 
            className="bg-surface-950/50 border border-surface-800 rounded-xl py-2 px-4 text-sm focus:border-primary-500/50 outline-none"
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
          >
            <option value="all">Tous les statuts</option>
            <option value="a_envoyer">À envoyer</option>
            <option value="en_attente">En attente</option>
            <option value="payee">Payée</option>
            <option value="en_retard">En retard</option>
          </select>
          <select 
            className="bg-surface-950/50 border border-surface-800 rounded-xl py-2 px-4 text-sm focus:border-primary-500/50 outline-none"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">Tous les types</option>
            <option value="invoice">Facture</option>
            <option value="quote">Devis</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card border-surface-800/50 bg-surface-900/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-900/50 border-b border-surface-800/50">
                <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-surface-500">Document</th>
                <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-surface-500">Client</th>
                <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-surface-500">Date</th>
                <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-surface-500">Total HT</th>
                <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-surface-500">Statut</th>
                <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-surface-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/30">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-10 text-center text-surface-500">Chargement...</td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-10 text-center text-surface-500">Aucun document trouvé.</td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-primary-500/[0.02] transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${invoice.type === 'quote' ? 'bg-purple-500/10 text-purple-400' : 'bg-primary-500/10 text-primary-400'}`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-surface-50">{invoice.number}</p>
                          <p className="text-[10px] text-surface-500 uppercase">{invoice.type === 'quote' ? 'Devis' : 'Facture'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <p className="text-sm font-semibold text-surface-200">{invoice.client_name}</p>
                      <p className="text-[10px] text-surface-500">{invoice.client_siren || 'Pas de SIREN'}</p>
                    </td>
                    <td className="p-5">
                      <p className="text-sm text-surface-300">{new Date(invoice.date_emission).toLocaleDateString('fr-FR')}</p>
                    </td>
                    <td className="p-5">
                      <p className="text-lg font-bold text-white">{parseFloat(invoice.total_ht).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</p>
                    </td>
                    <td className="p-5">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {invoice.status !== 'payee' && (
                          <button 
                            onClick={() => handleMarkAsPaid(invoice.id)}
                            className="p-2 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors tooltip"
                            title="Marquer comme payée"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleSendEmail(invoice)}
                          className="p-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                          title="Envoyer par email"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        {invoice.pdf_url && (
                          <a 
                            href={invoice.pdf_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 transition-colors"
                            title="Télécharger PDF"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InvoiceModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onSuccess={fetchInvoices}
      />
    </div>
  );
}
