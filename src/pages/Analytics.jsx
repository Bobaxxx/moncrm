import { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  MessageSquare, 
  FileText, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  Filter
} from 'lucide-react';
import { getDailyReport } from '../services/api';

export default function Analytics() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    fetchData();
  }, [days]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getDailyReport(days);
      // Formater les dates pour l'affichage (DD/MM)
      const formattedData = res.data.map(item => ({
        ...item,
        dateDisplay: new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      }));
      setData(formattedData);
    } catch (err) {
      console.error('Analytics load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { 
      label: 'SMS Envoyés', 
      value: data.reduce((acc, curr) => acc + curr.sms_envoye, 0),
      icon: MessageSquare,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10'
    },
    { 
      label: 'Maquettes Demandées', 
      value: data.reduce((acc, curr) => acc + curr.maquette_demandee, 0),
      icon: FileText,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10'
    },
    { 
      label: 'Maquettes Envoyées', 
      value: data.reduce((acc, curr) => acc + curr.maquette_envoyee, 0),
      icon: TrendingUp,
      color: 'text-cyan-400',
      bg: 'bg-cyan-400/10'
    },
    { 
      label: 'Clients Signés', 
      value: data.reduce((acc, curr) => acc + curr.client_signe, 0),
      icon: Users,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">Bilan de l'Activité</h1>
          <p className="text-sm text-surface-500 mt-1">Analyse des performances par jour</p>
        </div>

        <div className="flex items-center gap-2 bg-surface-900/50 p-1 rounded-xl border border-surface-800/50">
          {[7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${days === d ? 'bg-primary-600 text-white shadow-lg' : 'text-surface-500 hover:text-surface-300'}`}
            >
              {d === 7 ? '7 jours' : d === 14 ? '2 semaines' : '1 mois'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="glass-card p-4 flex flex-col gap-3">
             <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
             </div>
             <div>
                <p className="text-2xl font-bold text-surface-50">{stat.value}</p>
                <p className="text-[10px] uppercase tracking-wider font-bold text-surface-500">{stat.label}</p>
             </div>
          </div>
        ))}
      </div>

      {/* Graphique principal */}
      <div className="glass-card p-6 min-h-[400px]">
        <h3 className="text-sm font-semibold text-surface-300 mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary-400" />
            Évolution des conversions
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorSms" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorMaquette" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis 
                dataKey="dateDisplay" 
                stroke="#6b7280" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
              />
              <YAxis 
                stroke="#6b7280" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(val) => val === 0 ? '' : val}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#1f2937', color: '#f9fafb', fontSize: '11px', borderRadius: '12px' }}
                itemStyle={{ padding: '2px 0' }}
              />
              <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
              <Area 
                name="SMS Envoyés"
                type="monotone" 
                dataKey="sms_envoye" 
                stroke="#fbbf24" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorSms)" 
              />
              <Area 
                name="Demandes Maquettes"
                type="monotone" 
                dataKey="maquette_demandee" 
                stroke="#a855f7" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorMaquette)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Détail par jour */}
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-800/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-surface-300">Détail par jour</h3>
            <span className="text-[10px] text-surface-500 font-bold uppercase tracking-widest">30 derniers jours max</span>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left text-xs">
                <thead className="bg-surface-900/40 text-surface-500 uppercase tracking-wider font-bold">
                   <tr>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3 text-amber-400">SMS</th>
                      <th className="px-6 py-3 text-purple-400">Maquettes</th>
                      <th className="px-6 py-3 text-emerald-400">Signatures</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/30">
                   {[...data].reverse().map((row, i) => (
                      <tr key={i} className="hover:bg-surface-800/20 transition-colors">
                         <td className="px-6 py-3 text-surface-400 font-medium">
                            {new Date(row.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                         </td>
                         <td className="px-6 py-3 font-bold text-surface-200">{row.sms_envoye || '-'}</td>
                         <td className="px-6 py-3 font-bold text-surface-200">{row.maquette_demandee || '-'}</td>
                         <td className="px-6 py-3 text-emerald-400 font-bold">{row.client_signe || '-'}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>

        {/* Info sur l'historique */}
        <div className="space-y-4">
            <div className="glass-card p-6 bg-primary-600/5 border-primary-500/20">
                <h4 className="text-sm font-bold text-primary-400 mb-2">Comment ça marche ?</h4>
                <p className="text-xs text-surface-400 leading-relaxed">
                    Le CRM enregistre maintenant chaque changement de statut en temps réel. 
                    Si vous passez 10 prospects en "SMS envoyé" aujourd'hui, vous verrez 10 dans ce rapport. 
                    Cela vous permet de suivre votre productivité réelle plutôt que juste le stock actuel de prospects.
                </p>
            </div>
            
            <div className="glass-card p-6">
                <h4 className="text-sm font-bold text-surface-300 mb-4">Objectifs suggérés</h4>
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-surface-500">Objectif SMS Quotidien</span>
                        <span className="text-surface-200 font-bold">50 / 100</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-800 rounded-full">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: '50%' }} />
                    </div>
                    
                    <div className="flex items-center justify-between text-xs mt-4">
                        <span className="text-surface-500">Taux conversion Maquette</span>
                        <span className="text-surface-200 font-bold">12%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-800 rounded-full">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: '12%' }} />
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
