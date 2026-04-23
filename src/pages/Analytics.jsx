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
  Filter,
  LayoutList
} from 'lucide-react';
import { getDailyReport } from '../services/api';

export default function Analytics() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30); // Default to 30 for calendar
  const [viewMode, setViewMode] = useState('calendar'); // Default to calendar as requested
  const [currentMonth, setCurrentMonth] = useState(new Date());

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
      label: 'Total Prospects', 
      value: data.reduce((acc, curr) => acc + (curr.total || 0), 0), // Note: curr.total might not be there depending on backend
      icon: Users,
      color: 'text-primary-400',
      bg: 'bg-primary-400/10'
    },
    { 
      label: 'SMS Envoyés', 
      value: data.reduce((acc, curr) => acc + (curr.sms_envoye || 0), 0),
      icon: MessageSquare,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10'
    },
    { 
      label: 'Maquettes Envoyées', 
      value: data.reduce((acc, curr) => acc + (curr.maquette_envoyee || 0), 0),
      icon: TrendingUp,
      color: 'text-cyan-400',
      bg: 'bg-cyan-400/10'
    },
    { 
      label: 'Clients Signés', 
      value: data.reduce((acc, curr) => acc + (curr.client_signe || 0), 0),
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

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-surface-900/50 p-1 rounded-xl border border-surface-800/50">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary-600 text-white shadow-lg' : 'text-surface-500 hover:text-surface-300'}`}
              title="Vue Liste"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-primary-600 text-white shadow-lg' : 'text-surface-500 hover:text-surface-300'}`}
              title="Vue Calendrier"
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 bg-surface-900/50 p-1 rounded-xl border border-surface-800/50">
            {[7, 14, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${days === d ? 'bg-primary-600 text-white shadow-lg' : 'text-surface-500 hover:text-surface-300'}`}
              >
                {d === 7 ? '7j' : d === 14 ? '14j' : d === 30 ? '30j' : '90j'}
              </button>
            ))}
          </div>
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
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
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
                name="Maquettes Envoyées"
                type="monotone" 
                dataKey="maquette_envoyee" 
                stroke="#22d3ee" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorMaquette)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <AnalyticsCalendar data={data} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Détail par jour */}
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-800/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-surface-300">Détail par jour</h3>
              <span className="text-[10px] text-surface-500 font-bold uppercase tracking-widest">{days} derniers jours</span>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-left text-xs">
                  <thead className="bg-surface-900/40 text-surface-500 uppercase tracking-wider font-bold">
                     <tr>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3 text-amber-400">SMS</th>
                        <th className="px-6 py-3 text-cyan-400">Maquettes Env.</th>
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
                           <td className="px-6 py-3 font-bold text-surface-200">{row.maquette_envoyee || '-'}</td>
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
                  <h4 className="text-sm font-bold text-surface-300 mb-4">Objectifs quotidiens</h4>
                  <div className="space-y-3">
                      {(() => {
                          const todayStr = new Date().toISOString().split('T')[0];
                          const todayData = data.find(d => d.date === todayStr) || {};
                          const smsValue = todayData.sms_envoye || 0;
                          const smsGoal = 150;
                          const smsPercent = Math.min(Math.round((smsValue / smsGoal) * 100), 100);
                          
                          const maquetteValue = todayData.maquette_envoyee || 0;
                          const maquetteGoal = 10;
                          const maquettePercent = Math.min(Math.round((maquetteValue / maquetteGoal) * 100), 100);

                          return (
                            <>
                              <div className="flex items-center justify-between text-xs">
                                  <span className="text-surface-500">Objectif SMS (Aujourd'hui)</span>
                                  <span className="text-surface-200 font-bold">{smsValue} / {smsGoal}</span>
                              </div>
                              <div className="w-full h-1.5 bg-surface-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-amber-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(245,158,11,0.4)]" 
                                    style={{ width: `${smsPercent}%` }} 
                                  />
                              </div>
                              
                              <div className="flex items-center justify-between text-xs mt-4">
                                  <span className="text-surface-500">Objectif Maquettes (Aujourd'hui)</span>
                                  <span className="text-surface-200 font-bold">{maquetteValue} / {maquetteGoal}</span>
                              </div>
                              <div className="w-full h-1.5 bg-surface-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-cyan-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(34,211,238,0.4)]" 
                                    style={{ width: `${maquettePercent}%` }} 
                                  />
                              </div>
                            </>
                          );
                      })()}
                  </div>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticsCalendar({ data, currentMonth, setCurrentMonth }) {
  const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Ajuster pour que Lundi soit 0
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonthDays = getDaysInMonth(year, month - 1);
  
  const calendarDays = [];
  // Jours du mois précédent
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({
      day: prevMonthDays - i,
      month: month - 1,
      year: year,
      current: false
    });
  }
  // Jours du mois actuel
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      day: i,
      month: month,
      year: year,
      current: true
    });
  }
  // Jours du mois suivant
  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    calendarDays.push({
      day: i,
      month: month + 1,
      year: year,
      current: false
    });
  }

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const getDataForDate = (d, m, y) => {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return data.find(item => item.date === dateStr);
  };

  const today = new Date();
  const isToday = (d, m, y) => d === today.getDate() && m === today.getMonth() && y === today.getFullYear();

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-surface-800/50 gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-bold text-surface-200 min-w-[120px]">
            {MOIS[month]} {year}
          </h3>
          <div className="flex items-center gap-1 bg-surface-900/50 p-0.5 rounded-lg border border-surface-800/50">
            <button onClick={() => navigateMonth(-1)} className="p-1 hover:bg-surface-800 rounded-md text-surface-400 hover:text-surface-100 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentMonth(new Date())} className="px-2 py-0.5 text-[10px] font-bold uppercase text-surface-500 hover:text-primary-400 transition-colors">
              Aujourd'hui
            </button>
            <button onClick={() => navigateMonth(1)} className="p-1 hover:bg-surface-800 rounded-md text-surface-400 hover:text-surface-100 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[10px] text-surface-500 uppercase font-bold">SMS</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-500" />
              <span className="text-[10px] text-surface-500 uppercase font-bold">Maquettes</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-surface-500 uppercase font-bold">Signatures</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-surface-800/50">
        {JOURS.map(j => (
          <div key={j} className="py-2 text-center text-[10px] font-bold text-surface-500 uppercase tracking-widest border-r last:border-r-0 border-surface-800/30 bg-surface-900/20">
            {j}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-fr">
        {calendarDays.map((dateObj, i) => {
          const dateData = getDataForDate(dateObj.day, dateObj.month, dateObj.year);
          const current = dateObj.current;
          const active = isToday(dateObj.day, dateObj.month, dateObj.year);

          return (
            <div 
              key={i} 
              className={`min-h-[100px] p-2 border-r border-b border-surface-800/30 flex flex-col gap-1 transition-colors
                ${!current ? 'bg-surface-950/40 opacity-30' : 'bg-surface-900/10'}
                ${active ? 'bg-primary-500/5' : ''}
                ${(i + 1) % 7 === 0 ? 'border-r-0' : ''}
              `}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${active ? 'w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center' : current ? 'text-surface-400' : 'text-surface-700'}`}>
                  {dateObj.day}
                </span>
              </div>
              
              {dateData && current && (
                <div className="mt-1 space-y-1">
                  {(dateData.sms_envoye || 0) > 0 && (
                    <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      <span className="text-[10px] font-bold text-amber-500 truncate">SMS</span>
                      <span className="text-[10px] font-black text-amber-200">{dateData.sms_envoye}</span>
                    </div>
                  )}
                  {(dateData.maquette_envoyee || 0) > 0 && (
                    <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                      <span className="text-[10px] font-bold text-cyan-500 truncate">MAQ</span>
                      <span className="text-[10px] font-black text-cyan-200">{dateData.maquette_envoyee}</span>
                    </div>
                  )}
                  {(dateData.client_signe || 0) > 0 && (
                    <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-[10px] font-bold text-emerald-500 truncate">SIG</span>
                      <span className="text-[10px] font-black text-emerald-200">{dateData.client_signe}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
