import { useState, useCallback, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  ChevronRight,
  Database,
  ArrowRight,
  Filter,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { previewFile, uploadFile } from '../services/api';
import FileDropzone from '../components/import/FileDropzone';

export default function Import() {
  const [files, setFiles] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [useFilter, setUseFilter] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('Serrurier');
  const [step, setStep] = useState(1); // 1: Drop, 2: Preview, 3: Success

  // Re-déclencher la preview quand 'useFilter' change en étape 2
  useEffect(() => {
    if (step === 2 && files.length > 0) {
      handlePreview();
    }
  }, [useFilter]);

  const onFilesSelected = (newFiles) => {
    setFiles(newFiles); // FileDropzone gère déjà l'accumulation ou le remplacement
    setError(null);
  };

  const handlePreview = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await previewFile(files, useFilter);
      setPreviewData(res.data);
      setStep(2);
    } catch (err) {
      setError("Erreur lors de l'analyse des fichiers. Vérifiez le format CSV/JSON.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    try {
      await uploadFile(files, useFilter, { category });
      setStep(3);
    } catch (err) {
      setError("Une erreur est survenue lors de l'importation vers la base de données.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setPreviewData(null);
    setStep(1);
    setError(null);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 animate-fade-in">
      {/* Header & Steps */}
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-3xl font-bold text-surface-50">Importer des Prospects</h1>
          <p className="text-surface-400 mt-2">Préparez vos fichiers CSV ou JSON pour alimenter votre CRM.</p>
        </div>
        
        <div className="flex items-center gap-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                step === s ? 'bg-primary-500 text-white scale-110 shadow-lg shadow-primary-500/20' : 
                step > s ? 'bg-emerald-500 text-white' : 'bg-surface-800 text-surface-500'
              }`}>
                {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
              </div>
              {s < 3 && <ChevronRight className="w-4 h-4 text-surface-700" />}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 animate-slide-up">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="space-y-6 animate-slide-up">
          <FileDropzone onFilesSelect={onFilesSelected} disabled={loading} />
          
          {files.length > 0 && (

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 glass-card border-surface-700/30 bg-surface-900/20">
              {/* Toggle Filtrage Intelligent */}
              <div 
                onClick={() => setUseFilter(!useFilter)}
                className={`flex items-center gap-4 p-3 pr-5 rounded-2xl border transition-all cursor-pointer select-none
                  ${useFilter ? 'bg-primary-500/5 border-primary-500/20' : 'bg-surface-800/20 border-surface-800/40'}`}
              >
                 <div className={`p-2 rounded-xl transition-colors ${useFilter ? 'bg-primary-500 text-white' : 'bg-surface-800 text-surface-500'}`}>
                    <Filter className="w-4 h-4" />
                 </div>
                 <div className="flex-1">
                    <p className="text-xs font-bold text-surface-200">Filtrage Intelligent</p>
                    <p className="text-[10px] text-surface-500 uppercase tracking-tight">Ignorer les sites existants</p>
                 </div>
                 <div className="ml-2">
                    {useFilter ? <ToggleRight className="w-7 h-7 text-primary-500" /> : <ToggleLeft className="w-7 h-7 text-surface-600" />}
                 </div>
              </div>

              {/* Nouveau: Champ Catégorie */}
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-[10px] uppercase font-bold text-surface-500 tracking-widest ml-1">Dossier / Catégorie</label>
                <input 
                  type="text" 
                  placeholder="Ex: Serruriers, Menuisiers..." 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input-field py-3 text-sm bg-surface-900 shadow-xl w-full"
                />
              </div>

              <button 
                onClick={handlePreview}
                disabled={loading}
                className="btn-primary w-full md:w-auto py-4 px-10 text-sm font-bold flex items-center justify-center gap-3 shadow-2xl shadow-primary-500/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                {loading ? 'Analyse en cours...' : `Analyser ${files.length} fichier(s)`}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 2 && previewData && (
        <div className="space-y-8 animate-slide-up">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 border-surface-800/40">
              <p className="text-xs uppercase font-bold text-surface-500 tracking-widest mb-1">Total Lignes</p>
              <h4 className="text-3xl font-bold text-white">{previewData.estimates?.total}</h4>
            </div>
            <div className="glass-card p-6 border-emerald-500/10 bg-emerald-500/[0.02]">
              <p className="text-xs uppercase font-bold text-emerald-500/60 tracking-widest mb-1">À Importer</p>
              <h4 className="text-3xl font-bold text-emerald-400">{previewData.estimates?.willImport}</h4>
            </div>
            <div className="glass-card p-6 border-surface-800/40">
              <p className="text-xs uppercase font-bold text-surface-500 tracking-widest mb-1">Filtrés</p>
              <h4 className="text-3xl font-bold text-surface-400">{previewData.estimates?.willFilter}</h4>
            </div>
          </div>

          <div className="glass-card overflow-hidden border-surface-800/40">
             <div className="p-4 border-b border-surface-800 flex items-center justify-between bg-surface-900/50">
               <h3 className="text-sm font-bold uppercase tracking-widest text-surface-400">Aperçu global</h3>
               
               <button 
                onClick={() => setUseFilter(!useFilter)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all
                  ${useFilter ? 'bg-primary-500/10 border-primary-500/30 text-primary-400' : 'bg-surface-800 border-surface-700 text-surface-500'}`}
               >
                 <Filter className="w-3 h-3" />
                 Filtre: {useFilter ? 'ACTIF' : 'DÉSACTIVÉ'}
               </button>
             </div>
             
             <div className="overflow-x-auto max-h-[400px] no-scrollbar">
               <table className="w-full text-xs text-left">
                 <thead className="bg-surface-900 sticky top-0">
                   <tr className="border-b border-surface-800">
                     <th className="px-4 py-3 text-surface-500">Source</th>
                     <th className="px-4 py-3 text-surface-500">Entreprise</th>
                     <th className="px-4 py-3 text-surface-500">Téléphone</th>
                     <th className="px-4 py-3 text-surface-500">Statut</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-surface-800">
                   {previewData.preview?.map((row, i) => (
                     <tr key={i} className="hover:bg-surface-800/20 transition-colors">
                       <td className="px-4 py-3 text-surface-400 font-mono italic truncate max-w-[100px]">{row._filename}</td>
                       <td className="px-4 py-3 font-semibold text-surface-200">{row[previewData.mapping.nom_entreprise]}</td>
                       <td className="px-4 py-3 text-surface-400">{row[previewData.mapping.telephone]}</td>
                       <td className="px-4 py-3">
                         {row._status === 'import' ? (
                           <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md font-bold uppercase text-[9px]">Garder</span>
                         ) : (
                           <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-md font-bold uppercase text-[9px]">{row._reason || 'Filtré'}</span>
                         )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => setStep(1)} className="btn-ghost py-3 px-8 text-sm">Précédent</button>
            <button 
              onClick={handleImport}
              disabled={loading}
              className="btn-primary py-4 px-12 text-sm font-bold flex items-center gap-3 shadow-2xl shadow-primary-500/20 active:scale-95 transition-all"
            >
              {loading ? 'Importation...' : `Lancer l'importation (${previewData.estimates?.willImport})`}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 3 && (
        <div className="glass-card max-w-xl mx-auto p-12 text-center animate-scale-in border-surface-800/40">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/10">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Importation Terminée !</h2>
          <p className="text-surface-400 mb-8 font-medium">Vos prospects ont été ajoutés avec succès.</p>
          
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => window.location.href = '#/database'}
              className="btn-primary py-3 text-sm flex items-center justify-center gap-2"
            >
              <Database className="w-5 h-5" />
              Voir la Base de Données
            </button>
            <button onClick={reset} className="btn-ghost py-3 text-sm">Réimporter</button>
          </div>
        </div>
      )}
    </div>
  );
}
