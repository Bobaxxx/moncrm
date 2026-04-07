import { useCallback, useState } from 'react';
import { Upload, FileText, X, FileJson, Files } from 'lucide-react';

export default function FileDropzone({ onFilesSelect, disabled }) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFiles = (files) => {
    const validFiles = Array.from(files).filter(file => file.name.match(/\.(csv|json)$/i));
    if (validFiles.length > 0) {
      const newFiles = [...selectedFiles, ...validFiles];
      // Éviter les doublons exacts par nom et taille
      const uniqueFiles = newFiles.filter((file, index, self) =>
        index === self.findIndex((t) => (
          t.name === file.name && t.size === file.size
        ))
      );
      setSelectedFiles(uniqueFiles);
      onFilesSelect(uniqueFiles);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files) {
      processFiles(files);
    }
  }, [selectedFiles, onFilesSelect]);

  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files) {
      processFiles(files);
    }
  };

  const removeFile = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesSelect(newFiles);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer group
          ${isDragging
            ? 'border-primary-500 bg-primary-500/10 scale-[1.01]'
            : 'border-surface-700/60 hover:border-primary-500/40 hover:bg-surface-900/40'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          type="file"
          accept=".csv,.json"
          multiple
          onChange={handleFileInput}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          id="file-upload-input"
        />

        <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center transition-all duration-300
          ${isDragging
            ? 'bg-primary-500/20 scale-110'
            : 'bg-surface-800/60 group-hover:bg-primary-500/10 group-hover:scale-105'
          }`}>
          <Upload className={`w-6 h-6 transition-colors duration-300
            ${isDragging ? 'text-primary-400' : 'text-surface-500 group-hover:text-primary-400'}`} />
        </div>

        <p className="mt-4 text-surface-300 font-medium text-sm">
          {isDragging ? 'Déposez les fichiers ici' : 'Ajouter des fichiers'}
        </p>
        <p className="mt-1 text-xs text-surface-600">
          CSV, JSON • Max 50 MB par fichier
        </p>
      </div>

      {selectedFiles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
          {selectedFiles.map((file, idx) => (
            <div key={`${file.name}-${idx}`} className="glass-card p-3 flex items-center gap-3 border-surface-800/30">
              <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0">
                {file.name.endsWith('.json')
                  ? <FileJson className="w-4 h-4 text-primary-400" />
                  : <FileText className="w-4 h-4 text-primary-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-surface-100 truncate">{file.name}</p>
                <p className="text-[10px] text-surface-500">{formatSize(file.size)}</p>
              </div>
              {!disabled && (
                <button
                  onClick={() => removeFile(idx)}
                  className="w-6 h-6 rounded-md hover:bg-red-500/20 text-surface-600 hover:text-red-400 flex items-center justify-center transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
