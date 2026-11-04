import { useState, useEffect } from 'react';
import {
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
  LayoutList,
  Footprints,
  MessagesSquare,
  Presentation,
  FlaskConical,
  Euro
} from 'lucide-react';
import { getDailyReport } from '../services/api';
import { useWorkspace } from '../contexts/useWorkspace';

// Classes Tailwind écrites en entier (Tailwind ne détecte pas les classes construites dynamiquement)
const TONES = {
  amber: { hex: '#fbbf24', text: 'text-amber-400', iconBg: 'bg-amber-400/10', dot: 'bg-amber-500', chip: 'bg-amber-500/10 border-amber-500/20', chipLabel: 'text-amber-500', chipValue: 'text-amber-200', bar: 'bg-amber-500' },
  purple: { hex: '#c084fc', text: 'text-purple-400', iconBg: 'bg-purple-400/10', dot: 'bg-purple-500', chip: 'bg-purple-500/10 border-purple-500/20', chipLabel: 'text-purple-400', chipValue: 'text-purple-200', bar: 'bg-purple-500' },
  cyan: { hex: '#22d3ee', text: 'text-cyan-400', iconBg: 'bg-cyan-400/10', dot: 'bg-cyan-500', chip: 'bg-cyan-500/10 border-cyan-500/20', chipLabel: 'text-cyan-500', chipValue: 'text-cyan-200', bar: 'bg-cyan-500' },
  indigo: { hex: '#818cf8', text: 'text-indigo-400', iconBg: 'bg-indigo-400/10', dot: 'bg-indigo-500', chip: 'bg-indigo-500/10 border-indigo-500/20', chipLabel: 'text-indigo-400', chipValue: 'text-indigo-200', bar: 'bg-indigo-500' },
  emerald: { hex: '#34d399', text: 'text-emerald-400', iconBg: 'bg-emerald-400/10', dot: 'bg-emerald-500', chip: 'bg-emerald-500/10 border-emerald-500/20', chipLabel: 'text-emerald-500', chipValue: 'text-emerald-200', bar: 'bg-emerald-500' },
  rose: { hex: '#fb7185', text: 'text-rose-400', iconBg: 'bg-rose-400/10', dot: 'bg-rose-500', chip: 'bg-rose-500/10 border-rose-500/20', chipLabel: 'text-rose-400', chipValue: 'text-rose-200', bar: 'bg-rose-500' }
};

// Indicateurs suivis par espace. `chart` : courbe dans le graphique, `goal` : objectif quotidien.
const SERIES = {
  site_web: [
    { key: 'sms_envoye', label: 'SMS Envoyés', short: 'SMS', icon: MessageSquare, tone: 'amber', chart: true, goal: 150 },
    { key: 'maquette_demandee', label: 'Maquettes Demandées', short: 'DEM', icon: FileText, tone: 'purple' },
    { key: 'maquette_envoyee', label: 'Maquettes Envoyées', short: 'MAQ', icon: TrendingUp, tone: 'cyan', chart: true, goal: 10 },
    { key: 'client_signe', label: 'Clients Signés', short: 'SIG', icon: Users, tone: 'emerald' }
  ],
  saas: [
    { key: 'visite_ou_contact_tente', label: 'Visites / contacts', short: 'VIS', icon: Footprints, tone: 'amber', chart: true, goal: 15 },
    { key: 'echange_qualifie', label: 'Échanges qualifiés', short: 'ÉCH', icon: MessagesSquare, tone: 'purple', chart: true, goal: 5 },
    { key: 'demo_faite', label: 'Démos faites', short: 'DÉMO', icon: Presentation, tone: 'cyan', chart: true, goal: 2 },
    { key: 'essai_actif', label: 'Essais lancés', short: 'ESS', icon: FlaskConical, tone: 'indigo' },
    { key: 'abonne', label: 'Abonnés', short: 'ABO', icon: Euro, tone: 'emerald' }
  ]
};

export default function Analytics() {
  const { offre, isSaas } = useWorkspace();
  const series = SERIES[offre] || SERIES.site_web;
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

  const total = (key) => data.reduce((acc, curr) => acc + (curr[key] || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayData = data.find(d => d.date === todayStr) || {};

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">Bilan de l'Activité{isSaas ? ' SaaS' : ''}</h1>
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
                {d}j
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid de stats */}
      <div className={`grid grid-cols-2 gap-4 ${series.length > 4 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
        {series.map((s) => {
          const tone = TONES[s.tone];
          return (
            <div key={s.key} className="glass-card p-4 flex flex-col gap-3">
               <div className={`w-10 h-10 rounded-xl ${tone.iconBg} flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${tone.text}`} />
               </div>
               <div>
                  <p className="text-2xl font-bold text-surface-50 tabular-nums">{total(s.key)}</p>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-surface-500">{s.label}</p>
               </div>
            </div>
          );
        })}
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
                {series.filter(s => s.chart).map(s => (
                  <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={TONES[s.tone].hex} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={TONES[s.tone].hex} stopOpacity={0}/>
                  </linearGradient>
                ))}
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
                allowDecimals={false}
                tickFormatter={(val) => val === 0 ? '' : val}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#1f2937', color: '#f9fafb', fontSize: '11px', borderRadius: '12px' }}
                itemStyle={{ padding: '2px 0' }}
              />
              <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
              {series.filter(s => s.chart).map(s => (
                <Area
                  key={s.key}
                  name={s.label}
                  type="monotone"
                  dataKey={s.key}
                  stroke={TONES[s.tone].hex}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#grad-${s.key})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <AnalyticsCalendar data={data} series={series} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} />
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
                        <th className="px-4 py-3">Date</th>
                        {series.map(s => (
                          <th key={s.key} className={`px-4 py-3 ${TONES[s.tone].text}`}>{s.short}</th>
                        ))}
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800/30">
                     {[...data].reverse().map((row, i) => (
                        <tr key={i} className="hover:bg-surface-800/20 transition-colors">
                           <td className="px-4 py-3 text-surface-400 font-medium whitespace-nowrap">
                              {new Date(row.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                           </td>
                           {series.map(s => (
                             <td key={s.key} className="px-4 py-3 font-bold text-surface-200 tabular-nums">{row[s.key] || '-'}</td>
                           ))}
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
                      Le CRM enregistre chaque changement de statut en temps réel.
                      Si vous passez 10 prospects en "{series[0].label}" aujourd'hui, vous verrez 10 dans ce rapport.
                      Cela vous permet de suivre votre productivité réelle plutôt que juste le stock actuel de prospects.
                  </p>
              </div>

              <div className="glass-card p-6">
                  <h4 className="text-sm font-bold text-surface-300 mb-4">Objectifs quotidiens</h4>
                  <div className="space-y-4">
                      {series.filter(s => s.goal).map(s => {
                        const value = todayData[s.key] || 0;
                        const percent = Math.min(Math.round((value / s.goal) * 100), 100);
                        return (
                          <div key={s.key} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-surface-500">Objectif {s.label} (Aujourd'hui)</span>
                              <span className="text-surface-200 font-bold tabular-nums">{value} / {s.goal}</span>
                            </div>
                            <div className="w-full h-1.5 bg-surface-800 rounded-full overflow-hidden">
                              <div className={`h-full ${TONES[s.tone].bar} rounded-full transition-all duration-1000`} style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticsCalendar({ data, series, currentMonth, setCurrentMonth }) {
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
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({ day: prevMonthDays - i, month: month - 1, year, current: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ day: i, month, year, current: true });
  }
  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    calendarDays.push({ day: i, month: month + 1, year, current: false });
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
          {series.map(s => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${TONES[s.tone].dot}`} />
              <span className="text-[10px] text-surface-500 uppercase font-bold">{s.label}</span>
            </div>
          ))}
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
                  {series.map(s => (dateData[s.key] || 0) > 0 && (
                    <div key={s.key} className={`flex items-center justify-between px-1.5 py-0.5 rounded border ${TONES[s.tone].chip}`}>
                      <span className={`text-[10px] font-bold truncate ${TONES[s.tone].chipLabel}`}>{s.short}</span>
                      <span className={`text-[10px] font-black ${TONES[s.tone].chipValue}`}>{dateData[s.key]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
