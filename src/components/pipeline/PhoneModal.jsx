import { useState } from 'react';
import { Smartphone, X, Save } from 'lucide-react';

export default function PhoneModal({ isOpen, onClose, onConfirm, prospectName }) {
  const [phoneName, setPhoneName] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-surface-950/80 backdrop-blur-sm animate-fade-in" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="bg-surface-900 border border-surface-800 rounded-3xl p-6 w-full max-w-md relative z-10 shadow-2xl animate-scale-in">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-surface-500 hover:text-surface-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500">
            <Smartphone className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-surface-50">Maquette Envoyée</h3>
            <p className="text-sm text-surface-400">
              Sur quel téléphone avez-vous envoyé la maquette pour <span className="text-surface-200 font-semibold">{prospectName}</span> ?
            </p>
          </div>

          <div className="w-full mt-4 space-y-4">
            <div className="relative group">
              <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 group-focus-within:text-primary-400 transition-colors" />
              <input 
                autoFocus
                type="text"
                value={phoneName}
                onChange={(e) => setPhoneName(e.target.value)}
                placeholder="Ex: iPhone 12, Samsung S21..."
                className="input-field w-full pl-11 py-3"
                onKeyDown={(e) => e.key === 'Enter' && phoneName.trim() && onConfirm(phoneName)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={onClose}
                className="btn-ghost flex-1 py-3"
              >
                Passer
              </button>
              <button 
                disabled={!phoneName.trim()}
                onClick={() => onConfirm(phoneName)}
                className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
              >
                <Save className="w-4 h-4" />
                Confirmer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
