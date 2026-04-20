import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import AddProspectModal from '../database/AddProspectModal';
import { 
  Database, 
  LayoutDashboard, 
  Upload, 
  MessageSquare, 
  Calendar, 
  Settings,
  ChevronRight,
  Plus,
  TrendingUp,
  LogOut,
  User,
  ShieldCheck,
  FileText,
  Star
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const NAV_ITEMS = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', desc: 'Vue d\'ensemble' },
  { path: '/database', icon: Database, label: 'Base de données', desc: 'Gestion des prospects' },
  { path: '/pipeline', icon: TrendingUp, label: 'Pipeline', desc: 'Suivi des ventes' },
  { path: '/clients', icon: Star, label: 'Clients Signés', desc: 'Contrats & Facturation' },
  { path: '/analytics', icon: FileText, label: 'Bilan de jour', desc: 'Analyses & KPI' },
  { path: '/import', icon: Upload, label: 'Importation', desc: 'Ajouter des fichiers' },
  { path: '/marketing', icon: MessageSquare, label: 'SMS Marketing', desc: 'Campagnes groupées' },
  { path: '/billing', icon: FileText, label: 'Facturation', desc: 'Factures & Devis' },
  { path: '/planning', icon: Calendar, label: 'Planning', desc: 'Tâches & Rappels' },
];

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
    <aside className="w-72 bg-surface-950 border-r border-surface-900 flex flex-col h-screen sticky top-0 animate-slide-in-left">
      {/* Brand */}
      <div className="p-8 pb-4">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-primary-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white group-hover:text-primary-400 transition-colors">MonCRM</span>
        </Link>
      </div>

      <div className="px-6 py-4 mb-4">
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full btn-primary py-3 rounded-2xl flex items-center justify-center gap-2 group shadow-xl shadow-primary-500/10"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-wider">Nouveau Prospect</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 mt-2 overflow-y-auto no-scrollbar">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex flex-col p-4 rounded-2xl transition-all duration-300 group relative
              ${isActive 
                ? 'bg-primary-500/10 border-primary-500/20 text-white' 
                : 'text-surface-500 hover:text-surface-200 hover:bg-surface-900/50'
              }
            `}
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-primary-400' : ''}`} />
                    <span className="text-sm font-semibold">{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-primary-500" />}
                </div>
                <span className={`text-[10px] mt-1 ml-8 transition-colors ${isActive ? 'text-primary-500/60' : 'text-surface-700'}`}>
                  {item.desc}
                </span>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-500 rounded-r-full shadow-[2px_0_8px_rgba(59,130,246,0.5)]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-4 mt-auto">
        <div className="glass-card p-4 border-surface-800/40 bg-surface-900/30 overflow-hidden group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-surface-800 border border-surface-700/50 flex items-center justify-center text-primary-400 group-hover:bg-primary-500/10 transition-colors">
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase font-bold text-surface-500 tracking-widest">{user?.email === 'jules43700@gmail.com' ? 'Admin' : 'Utilisateur'}</p>
              <p className="text-xs font-semibold text-surface-200 truncate">{user?.email}</p>
            </div>
          </div>
          
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center justify-between p-2 rounded-xl text-surface-600 hover:text-red-400 hover:bg-red-500/10 transition-all font-bold text-[10px] uppercase"
          >
            Se déconnecter
            <LogOut className="w-3 h-3" />
          </button>
        </div>
      </div>
    </aside>

    <AddProspectModal
      isOpen={showAddModal}
      onClose={() => setShowAddModal(false)}
      onRefresh={() => {}}
    />
    </>
  );
}
