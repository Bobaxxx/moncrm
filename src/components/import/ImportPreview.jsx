import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const statusConfig = {
  import: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'À importer' },
  filtered: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Filtré' },
  duplicate: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Doublon' }
};

export default function ImportPreview({ data, mapping }) {
  if (!data || data.length === 0) return null;

  const headers = Object.keys(data[0]).filter(h => !h.startsWith('_'));
  const mappedFields = Object.values(mapping);

  return (
    <div className="glass-card overflow-hidden animate-slide-up">
      <div className="px-6 py-4 border-b border-surface-800/50">
        <h3 className="text-sm font-semibold text-surface-200">
          Prévisualisation
          <span className="ml-2 text-surface-500 font-normal">({data.length} premières lignes)</span>
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-800/40">
              <th className="px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider w-[120px]">
                Statut
              </th>
              {headers.map(h => (
                <th
                  key={h}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider
                    ${mappedFields.includes(h) ? 'text-primary-400' : 'text-surface-600'}`}
                >
                  {h}
                  {mappedFields.includes(h) && (
                    <span className="ml-1.5 text-[10px] normal-case font-normal text-primary-500">
                      ({Object.entries(mapping).find(([, v]) => v === h)?.[0]})
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => {
              const status = statusConfig[row._status] || statusConfig.import;
              const StatusIcon = status.icon;
              return (
                <tr
                  key={i}
                  className={`border-b border-surface-800/20 transition-colors hover:bg-surface-800/30
                    ${row._status === 'filtered' ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {status.label}
                    </div>
                    {row._reason && (
                      <p className="text-[10px] text-surface-600 mt-1 pl-1">{row._reason}</p>
                    )}
                  </td>
                  {headers.map(h => (
                    <td key={h} className="px-4 py-3 text-surface-300 max-w-[200px] truncate">
                      {row[h] || '—'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
