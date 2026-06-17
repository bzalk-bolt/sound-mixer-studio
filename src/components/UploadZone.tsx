import { useCallback, useState } from 'react';
import { Upload, Music, X } from 'lucide-react';

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  label: string;
  acceptedTypes?: string;
  currentFile?: string | null;
  onClear?: () => void;
}

export function UploadZone({ onFileSelected, label, acceptedTypes, currentFile, onClear }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelected(file);
  }, [onFileSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  }

  if (currentFile) {
    return (
      <div className="relative flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08]">
        <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center">
          <Music className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium truncate">{currentFile}</p>
          <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{label}</p>
        </div>
        {onClear && (
          <button
            onClick={onClear}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-neutral-400" />
          </button>
        )}
      </div>
    );
  }

  return (
    <label
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
        isDragging
          ? 'border-cyan-500/50 bg-cyan-500/5'
          : 'border-white/[0.08] hover:border-white/[0.15] bg-white/[0.01] hover:bg-white/[0.03]'
      }`}
    >
      <input
        type="file"
        className="hidden"
        accept={acceptedTypes || 'audio/*'}
        onChange={handleInputChange}
      />
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${
        isDragging ? 'bg-cyan-500/10' : 'bg-white/[0.04]'
      }`}>
        <Upload className={`w-5 h-5 ${isDragging ? 'text-cyan-400' : 'text-neutral-400'}`} />
      </div>
      <p className="text-sm text-neutral-300 font-medium mb-1">{label}</p>
      <p className="text-xs text-neutral-500">WAV, FLAC, AIFF, MP3, M4A, AAC</p>
    </label>
  );
}
