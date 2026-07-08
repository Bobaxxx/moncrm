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
  PhoneCall, 
  MessageSquare, 
  Clock, 
  XCircle, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  LayoutList,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';
import { getCallsReport } from '../services/api';

export default function CallsAnalytics() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30); 
  const [viewMode, setViewMode] = useState('calendar'); 
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchData();
  }, [days]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getCallsReport(days);
      const formattedData = res.data.map(item => ({
        ...item,
        dateDisplay: new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      }));
      setData(formattedData);
    } catch (err) {
      console.error('Calls analytics load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { 
      label: 'Appels passés', 
      value: data.reduce((acc, curr) => acc + (curr.total || 0), 0),
      icon: PhoneCall,
      color: 'text-primary-400',
      bg: 'bg-primary-400/10'
    },
    { 
      label: 'Appelés (Répondu)', 
      value: data.reduce((acc, curr) => acc + (curr.appele || 0), 0),
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10'
    },
    { 
      label: 'Messages laissés', 
      value: data.reduce((acc, curr) => acc + (curr.message_laisse || 0), 0),
      icon: MessageSquare,
      color: 'text-slate-400',
      bg: 'bg-slate-400/10'
    },
    { 
      label: 'À rappeler', 
      value: data.reduce((acc, curr) => acc + (curr.a_rappeler || 0), 0),
      icon: Clock,
      color: 'text-indigo-400',
      bg: 'bg-indigo-400/10'
    },
    { 
      label: 'Pas intéressés', 
      value: data.reduce((acc, curr) => acc + (curr.pas_interesse || 0), 0),
      icon: XCircle,
      color: 'text-rose-400',
      bg: 'bg-rose-400/10'
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
          <h1 className="text-2xl font-bold text-surface-50">Bilan des Appels</h1>
          <p className="text-sm text-surface-500 mt-1">Analyse des performances de prospection téléphonique par jour</p>
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
            Évolution de l'activité téléphonique
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAppele" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
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
                name="Total Appels"
                type="monotone" 
                dataKey="total" 
                stroke="#6366f1" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorCalls)" 
              />
              <Area 
                name="Appelés (Répondu)"
                type="monotone" 
                dataKey="appele" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorAppele)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <CallsAnalyticsCalendar data={data} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} />
      ) : (
        <div className="grid grid-cols-1 gap-6">
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
                        <th className="px-6 py-3 text-primary-400">Total Appels</th>
                        <th className="px-6 py-3 text-emerald-400">Répondus (Appelé)</th>
                        <th className="px-6 py-3 text-slate-400">Message laissé</th>
                        <th className="px-6 py-3 text-indigo-400">À rappeler</th>
                        <th className="px-6 py-3 text-rose-400">Pas intéressé</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800/30">
                     {[...data].reverse().map((row, i) => (
                        <tr key={i} className="hover:bg-surface-800/20 transition-colors">
                           <td className="px-6 py-3 text-surface-400 font-medium">
                              {new Date(row.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                           </td>
                           <td className="px-6 py-3 font-bold text-surface-200">{row.total || '-'}</td>
                           <td className="px-6 py-3 font-bold text-emerald-400">{row.appele || '-'}</td>
                           <td className="px-6 py-3 font-bold text-surface-300">{row.message_laisse || '-'}</td>
                           <td className="px-6 py-3 font-bold text-indigo-400">{row.a_rappeler || '-'}</td>
                           <td className="px-6 py-3 font-bold text-rose-400">{row.pas_interesse || '-'}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CallsAnalyticsCalendar({ data, currentMonth, setCurrentMonth }) {
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
              <div className="w-2 h-2 rounded-full bg-primary-500" />
              <span className="text-[10px] text-surface-500 uppercase font-bold">Appels</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-surface-500 uppercase font-bold">Répondus</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-500" />
              <span className="text-[10px] text-surface-500 uppercase font-bold">Msg Laissé</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-[10px] text-surface-500 uppercase font-bold">À rappeler</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-[10px] text-surface-500 uppercase font-bold">Refus</span>
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
              className={`min-h-[120px] p-2 border-r border-b border-surface-800/30 flex flex-col gap-1 transition-colors
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
                <div className="mt-1 space-y-0.5">
                  {(dateData.total || 0) > 0 && (
                    <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-primary-500/10 border border-primary-500/20">
                      <span className="text-[9px] font-bold text-primary-400 truncate">Total</span>
                      <span className="text-[9px] font-black text-primary-200">{dateData.total}</span>
                    </div>
                  )}
                  {(dateData.appele || 0) > 0 && (
                    <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-[9px] font-bold text-emerald-500 truncate">Rép</span>
                      <span className="text-[9px] font-black text-emerald-200">{dateData.appele}</span>
                    </div>
                  )}
                  {(dateData.message_laisse || 0) > 0 && (
                    <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-slate-500/10 border border-slate-500/20">
                      <span className="text-[9px] font-bold text-slate-500 truncate">Msg</span>
                      <span className="text-[9px] font-black text-slate-200">{dateData.message_laisse}</span>
                    </div>
                  )}
                  {(dateData.a_rappeler || 0) > 0 && (
                    <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                      <span className="text-[9px] font-bold text-indigo-500 truncate">Rap</span>
                      <span className="text-[9px] font-black text-indigo-200">{dateData.a_rappeler}</span>
                    </div>
                  )}
                  {(dateData.pas_interesse || 0) > 0 && (
                    <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                      <span className="text-[9px] font-bold text-rose-500 truncate">Ref</span>
                      <span className="text-[9px] font-black text-rose-200">{dateData.pas_interesse}</span>
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
