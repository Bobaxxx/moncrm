import { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  X, 
  Save, 
  Euro, 
  Tag,
  AlertCircle
} from 'lucide-react';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../services/api';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'service'
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await getProducts();
      setProducts(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateProduct(editingId, formData);
      } else {
        await createProduct(formData);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ name: '', description: '', price: '', category: 'service' });
      fetchProducts();
    } catch (err) {
      alert('Erreur lors de l''enregistrement');
    }
  };

  const handleEdit = (p) => {
    setEditingId(p.id);
    setFormData({
      name: p.name,
      description: p.description || '',
      price: p.price,
      category: p.category || 'service'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce produit ?')) return;
    try {
      await deleteProduct(id);
      fetchProducts();
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-surface-50 flex items-center gap-3">
            <Package className="w-8 h-8 text-primary-500" />
            Catalogue Produits & Services
          </h1>
          <p className="text-surface-500 mt-2">Gérez vos prestations types pour facturer plus vite</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', description: '', price: '', category: 'service' });
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2 group"
        >
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="w-4 h-4" />
          </div>
          Nouveau produit
        </button>
      </div>

      {/* Stats Quick Look */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-primary-500/10 bg-primary-500/[0.02]">
          <p className="text-[10px] uppercase font-bold text-primary-500/60 tracking-[0.2em] mb-1">Total Références</p>
          <p className="text-4xl font-black text-white leading-none">{products.length}</p>
        </div>
        <div className="glass-card p-6">
          <p className="text-[10px] uppercase font-bold text-surface-500 tracking-[0.2em] mb-1">Services</p>
          <p className="text-4xl font-black text-white leading-none">
            {products.filter(p => p.category === 'service').length}
          </p>
        </div>
        <div className="glass-card p-6">
          <p className="text-[10px] uppercase font-bold text-surface-500 tracking-[0.2em] mb-1">Abonnements</p>
          <p className="text-4xl font-black text-white leading-none">
            {products.filter(p => p.category === 'abonnement').length}
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
          <input 
            type="text" 
            placeholder="Rechercher un produit, une description..." 
            className="input-field pl-12 w-full py-3"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Product List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="glass-card h-48 animate-pulse bg-surface-800/20" />
          ))
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full py-20 text-center glass-card border-dashed">
            <Package className="w-12 h-12 text-surface-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-surface-400">Aucun produit trouvé</h3>
            <p className="text-sm text-surface-600 mt-1">Commencez par créer votre catalogue de prestations</p>
          </div>
        ) : (
          filteredProducts.map(p => (
            <div key={p.id} className="glass-card group hover:border-primary-500/30 transition-all duration-500 p-6 flex flex-col justify-between overflow-hidden relative">
              {/* Background Accent */}
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-500/5 rounded-full blur-2xl group-hover:bg-primary-500/10 transition-colors" />
              
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border
                    ${p.category === 'abonnement' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-primary-500/10 text-primary-400 border-primary-500/20'}
                  `}>
                    {p.category}
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleEdit(p)}
                      className="p-2 rounded-xl hover:bg-surface-800 text-surface-500 hover:text-white transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(p.id)}
                      className="p-2 rounded-xl hover:bg-red-500/10 text-surface-500 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary-400 transition-colors">{p.name}</h3>
                <p className="text-sm text-surface-500 line-clamp-2 mb-6 h-10">{p.description || 'Aucune description'}</p>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-surface-800/50">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white">{p.price}</span>
                  <span className="text-xs font-bold text-surface-500">€ HT</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-xl shadow-2xl border-surface-700/50">
            <div className="p-6 border-b border-surface-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary-500" />
                {editingId ? 'Modifier le produit' : 'Nouveau produit'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-surface-800 rounded-lg text-surface-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="text-[10px] uppercase font-bold text-surface-500 tracking-widest mb-2 block">Nom du produit / service *</label>
                  <input 
                    type="text" 
                    required
                    className="input-field w-full p-3"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Refonte Site Web"
                  />
                </div>
                
                <div className="col-span-2 md:col-span-1">
                  <label className="text-[10px] uppercase font-bold text-surface-500 tracking-widest mb-2 block">Prix HT (€) *</label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                    <input 
                      type="number" 
                      required
                      step="0.01"
                      className="input-field w-full pl-10 p-3"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: e.target.value})}
                      placeholder="890.00"
                    />
                  </div>
                </div>

                <div className="col-span-2 md:col-span-1">
                  <label className="text-[10px] uppercase font-bold text-surface-500 tracking-widest mb-2 block">Catégorie</label>
                  <select 
                    className="input-field w-full p-3"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="service">Service</option>
                    <option value="produit">Produit</option>
                    <option value="abonnement">Abonnement</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] uppercase font-bold text-surface-500 tracking-widest mb-2 block">Description</label>
                  <textarea 
                    className="input-field w-full p-3 h-32 resize-none"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Détails de la prestation..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 rounded-xl bg-surface-800 text-surface-300 font-bold text-xs uppercase"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="btn-primary px-8 py-2.5 rounded-xl flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingId ? 'Enregistrer les modifications' : 'Créer le produit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
