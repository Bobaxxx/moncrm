import { Download, Filter, Copy, CheckCircle } from 'lucide-react';

export default function FilterStats({ stats, isResult }) {
  if (!stats) return null;

  const items = [
    {
      label: 'Total lignes',
      value: isResult ? stats.total : stats.total,
      icon: Download,
      color: 'text-surface-300',
      bg: 'bg-surface-700/40'
    },
    {
      label: isResult ? 'Importés' : 'À importer',
      value: isResult ? stats.imported : stats.willImport,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/15'
    },
    {
      label: 'Filtrés',
      value: isResult ? stats.filtered : stats.willFilter,
      icon: Filter,
      color: 'text-red-400',
      bg: 'bg-red-500/15'
    },
    {
      label: 'Doublons',
      value: isResult ? stats.duplicates : stats.willDuplicate,
      icon: Copy,
      color: 'text-amber-400',
      bg: 'bg-amber-500/15'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up">
      {items.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className="glass-card p-5">
          <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <p className={`text-2xl font-bold ${color}`}>{value ?? 0}</p>
          <p className="text-xs text-surface-500 mt-1 font-medium">{label}</p>
        </div>
      ))}
    </div>
  );
}
