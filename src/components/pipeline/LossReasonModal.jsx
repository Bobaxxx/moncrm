import { useState } from 'react';
import { X, XCircle } from 'lucide-react';

const QUICK_REASONS = ['Trop cher', 'Pas le temps', 'Déjà équipé', 'Pas de besoin', 'Injoignable', 'Fait sur papier / Excel'];

export default function LossReasonModal({ isOpen, onClose, onConfirm, prospectName }) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const submit = (e) => {
    e.preventDefault();
    onConfirm(reason.trim());
    setReason('');
  };

  const cancel = () => {
    setReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-900 border border-surface-800 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-surface-800">
          <h2 className="text-lg font-bold text-surface-50 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-rose-400" />
            Prospect perdu
          </h2>
          <button onClick={cancel} className="p-2 hover:bg-surface-800 rounded-xl transition-colors" aria-label="Annuler">
            <X className="w-5 h-5 text-surface-500" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <p className="text-sm text-surface-400">
            Pourquoi <span className="text-surface-200 font-semibold">{prospectName}</span> a refusé ?
          </p>

          <div className="flex flex-wrap gap-2">
            {QUICK_REASONS.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all
                  ${reason === r
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                    : 'bg-surface-800/50 text-surface-400 border-surface-700/50 hover:text-surface-200'}`}
              >
                {r}
              </button>
            ))}
          </div>

          <input
            autoFocus
            type="text"
            maxLength={120}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Raison courte (ex : trop cher, déjà sur Batappli...)"
            className="input-field w-full"
          />

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={cancel}
              className="flex-1 px-4 py-2.5 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded-xl transition-all font-bold"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-all font-bold shadow-lg shadow-rose-600/20"
            >
              Marquer perdu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
