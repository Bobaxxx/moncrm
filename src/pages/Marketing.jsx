import { MessageSquare, Send, Calendar, Clock, CheckCircle2 } from 'lucide-react';

export default function Marketing() {
  return (
    <div className="max-w-6xl mx-auto py-8 px-4 animate-fade-in">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold text-surface-50">SMS Marketing</h1>
          <p className="text-surface-400 mt-2">Préparez et envoyez vos campagnes de prospection groupées.</p>
        </div>
        <button className="btn-primary py-3 px-8 text-sm flex items-center gap-2 shadow-xl shadow-primary-500/20 hover:scale-105 transition-transform">
          Nouvelle Campagne
          <Send className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="glass-card p-6 border-surface-800/40">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary-500/10 rounded-lg">
              <MessageSquare className="w-5 h-5 text-primary-400" />
            </div>
            <span className="text-xs font-bold text-surface-400 uppercase tracking-widest">Total Envoyés</span>
          </div>
          <h4 className="text-3xl font-bold text-white">0</h4>
        </div>
        <div className="glass-card p-6 border-surface-800/40">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xs font-bold text-surface-400 uppercase tracking-widest">Taux d'ouverture</span>
          </div>
          <h4 className="text-3xl font-bold text-emerald-400">0%</h4>
        </div>
        <div className="glass-card p-6 border-surface-800/40">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-xs font-bold text-surface-400 uppercase tracking-widest">En attente</span>
          </div>
          <h4 className="text-3xl font-bold text-amber-400">0</h4>
        </div>
      </div>

      <div className="glass-card p-12 text-center border-dashed border-surface-800 bg-surface-900/10">
        <div className="w-16 h-16 bg-surface-800/50 text-surface-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Calendar className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-surface-200 mb-2">Aucune campagne en cours</h3>
        <p className="text-surface-500 max-w-sm mx-auto">Lancez votre première campagne SMS pour toucher vos prospects instantanément.</p>
      </div>
    </div>
  );
}
