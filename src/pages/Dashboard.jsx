import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Upload, MessageSquare, TrendingUp, ArrowRight, Phone, Globe, MapPin, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { getProspectStats, getImportHistory, getPlanningTasks } from '../services/api';
import { STATUT_LABELS, STATUT_COLORS, SOURCE_LABELS } from '../utils/constants';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [imports, setImports] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [statsRes, importsRes, tasksRes] = await Promise.all([
        getProspectStats(),
        getImportHistory(),
        getPlanningTasks({ date: today })
      ]);
      setStats(statsRes.data);
      setImports(importsRes.data.slice(0, 5));
      setTodayTasks(tasksRes.data);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const quickActions = [
    { label: 'Importer des prospects', icon: Upload, to: '/import', color: 'from-primary-500 to-primary-700' },
    { label: 'Voir le pipeline', icon: TrendingUp, to: '/pipeline', color: 'from-emerald-500 to-emerald-700' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-surface-50">Dashboard</h1>
        <p className="text-surface-500 mt-2">Vue d'ensemble de votre prospection</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quickActions.map(({ label, icon: Icon, to, color }) => (
          <Link
            key={to}
            to={to}
            className="glass-card-hover p-6 flex items-center gap-4 group"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-surface-200 group-hover:text-surface-50 transition-colors">{label}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-surface-600 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
          </Link>
        ))}
      </div>

      {/* Today's Planning */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-surface-300 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-400" />
            Planning du jour
          </h3>
          <Link to="/planning" className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors">
            Voir tout <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        
        {todayTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayTasks.slice(0, 3).map(task => (
              <div key={task.id} className="bg-surface-800/40 border border-surface-700/30 rounded-xl p-3 flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0`} style={{ backgroundColor: `${task.couleur}20`, color: task.couleur }}>
                  {task.completed ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${task.completed ? 'line-through text-surface-500' : 'text-surface-200'}`}>
                    {task.titre}
                  </p>
                  <p className="text-[10px] text-surface-500 mt-0.5">
                    {task.heure_debut || 'Toute la journée'} {task.prospect_nom ? `• ${task.prospect_nom}` : ''}
                  </p>
                </div>
              </div>
            ))}
            {todayTasks.length > 3 && (
              <Link to="/planning" className="bg-surface-800/20 border border-dashed border-surface-700/40 rounded-xl p-3 flex items-center justify-center text-xs text-surface-500 hover:text-surface-300 transition-all">
                + {todayTasks.length - 3} autres tâches
              </Link>
            )}
          </div>
        ) : (
          <div className="text-center py-6 bg-surface-800/20 rounded-xl border border-dashed border-surface-700/40">
            <p className="text-sm text-surface-600">Aucune tâche prévue pour aujourd'hui</p>
            <Link to="/planning" className="text-xs text-primary-400 hover:text-primary-300 mt-2 inline-block">
              + Programmer ma journée
            </Link>
          </div>
        )}
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center mb-2">
            <Users className="w-5 h-5 text-primary-400" />
          </div>
          <p className="text-3xl font-bold text-surface-50">{stats?.total || 0}</p>
          <p className="text-xs text-surface-500 font-medium">Total prospects</p>
        </div>

        {stats?.byStatut?.filter(s => s.statut === 'a_contacter').map(s => (
          <div key={s.statut} className="stat-card">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-2">
              <Phone className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-surface-50">{s.count}</p>
            <p className="text-xs text-surface-500 font-medium">À contacter</p>
          </div>
        ))}

        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center mb-2 relative">
            <MessageSquare className="w-5 h-5 text-amber-400" />
            {stats?.smsToday > 0 && (
              <div className="absolute -top-1 -right-1 bg-amber-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full animate-pulse shadow-lg">
                +{stats.smsToday}
              </div>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-surface-50">
              {stats?.byStatut?.find(s => s.statut === 'sms_envoye')?.count || 0}
            </p>
            <span className="text-[10px] text-amber-500 font-bold uppercase tracking-tight">
              Total
            </span>
          </div>
          <p className="text-xs text-surface-500 font-medium">
            {stats?.smsToday || 0} envoyés aujourd'hui
          </p>
        </div>

        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-2 relative">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            {stats?.maquettesToday > 0 && (
              <div className="absolute -top-1 -right-1 bg-cyan-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full animate-pulse shadow-lg">
                +{stats.maquettesToday}
              </div>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-surface-50">
              {stats?.byStatut?.find(s => s.statut === 'maquette_envoyee')?.count || 0}
            </p>
            <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-tight">
              Total
            </span>
          </div>
          <p className="text-xs text-surface-500 font-medium">
            {stats?.maquettesToday || 0} envoyées aujourd'hui
          </p>
        </div>

        {stats?.byStatut?.filter(s => s.statut === 'client_signe').map(s => (
          <div key={s.statut} className="stat-card">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-surface-50">{s.count}</p>
            <p className="text-xs text-surface-500 font-medium">Clients signés</p>
          </div>
        ))}
      </div>

      {/* Pipeline breakdown & Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-surface-300 mb-4">Pipeline</h3>
          <div className="space-y-3">
            {stats?.byStatut?.map(({ statut, count }) => {
              const colors = STATUT_COLORS[statut];
              const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={statut} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${colors?.dot || 'bg-surface-500'}`} />
                  <span className="text-sm text-surface-400 w-40 truncate">
                    {STATUT_LABELS[statut] || statut}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-surface-800/60 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${colors?.dot || 'bg-surface-500'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-surface-300 w-10 text-right">{count}</span>
                </div>
              );
            })}
            {(!stats?.byStatut || stats.byStatut.length === 0) && (
              <p className="text-sm text-surface-600 text-center py-4">Aucun prospect pour le moment</p>
            )}
          </div>
        </div>

        {/* Sources */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-surface-300 mb-4">Sources</h3>
          <div className="space-y-3">
            {stats?.bySource?.map(({ source, count }) => {
              const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={source} className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-surface-500 flex-shrink-0" />
                  <span className="text-sm text-surface-400 w-32 truncate">
                    {SOURCE_LABELS[source] || source}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-surface-800/60 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary-500/70 transition-all duration-700"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-surface-300 w-10 text-right">{count}</span>
                </div>
              );
            })}
            {(!stats?.bySource || stats.bySource.length === 0) && (
              <p className="text-sm text-surface-600 text-center py-4">Aucune source</p>
            )}
          </div>
        </div>
      </div>

      {/* Top departments */}
      {stats?.byDepartement && stats.byDepartement.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-surface-300 mb-4">Top départements</h3>
          <div className="flex flex-wrap gap-2">
            {stats.byDepartement.map(({ departement, count }) => (
              <div key={departement} className="flex items-center gap-2 bg-surface-800/50 border border-surface-700/40 rounded-xl px-3 py-2">
                <MapPin className="w-3.5 h-3.5 text-primary-400" />
                <span className="text-sm text-surface-300 font-medium">{departement || 'N/A'}</span>
                <span className="text-xs text-surface-500 bg-surface-700/50 px-2 py-0.5 rounded-full">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent imports */}
      {imports.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-800/50">
            <h3 className="text-sm font-semibold text-surface-300">Derniers imports</h3>
          </div>
          <div className="divide-y divide-surface-800/30">
            {imports.map((imp) => (
              <div key={imp.id} className="flex items-center gap-4 px-6 py-4 hover:bg-surface-800/20 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-primary-600/15 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-200 truncate">{imp.filename}</p>
                  <p className="text-xs text-surface-500">{new Date(imp.created_at).toLocaleString('fr-FR')}</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-400 font-medium">{imp.lignes_importees} importés</span>
                  <span className="text-surface-600">|</span>
                  <span className="text-red-400">{imp.lignes_filtrees} filtrés</span>
                  <span className="text-surface-600">|</span>
                  <span className="text-amber-400">{imp.doublons_ignores} doublons</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
