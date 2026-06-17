import { X } from 'lucide-react';
import type { Candidate, ProcessingLogEntry } from '../types/mastering';

interface ProcessingLogModalProps {
  isOpen: boolean;
  candidate: Candidate | null;
  logs: ProcessingLogEntry[];
  onClose: () => void;
}

function compactDetails(entry: ProcessingLogEntry) {
  const { ts, event, ...details } = entry;
  if (Object.keys(details).length === 0) return '';
  return JSON.stringify(details, null, 2);
}

function formatEventName(event: string) {
  return event.replace(/^mastering_/, '').replace(/_/g, ' ');
}

function relevantLogs(logs: ProcessingLogEntry[], candidate: Candidate | null) {
  if (!candidate) return logs;
  return logs.filter((entry) => {
    const candidateId = entry.candidate_id;
    if (candidateId === candidate.candidate_id) return true;
    return typeof candidateId === 'undefined';
  });
}

export function ProcessingLogModal({ isOpen, candidate, logs, onClose }: ProcessingLogModalProps) {
  if (!isOpen) return null;

  const visibleLogs = relevantLogs(logs, candidate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[82vh] mx-4 bg-neutral-900 border border-white/[0.08] rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-sm font-semibold text-white">Processing Logs</h3>
            <p className="text-xs text-neutral-500 mt-1">
              {candidate ? `${candidate.style} / ${candidate.loudness}` : 'Mastering job'} - {visibleLogs.length} entries
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-neutral-400" />
          </button>
        </div>

        <div className="max-h-[68vh] overflow-auto px-5 py-4">
          {visibleLogs.length === 0 ? (
            <div className="text-sm text-neutral-400">No processing logs were returned for this job.</div>
          ) : (
            <div className="space-y-3">
              {visibleLogs.map((entry, index) => {
                const details = compactDetails(entry);
                return (
                  <div key={`${entry.ts}-${entry.event}-${index}`} className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-medium text-white capitalize">{formatEventName(entry.event)}</div>
                      <div className="text-[10px] text-neutral-500 tabular-nums">{entry.ts}</div>
                    </div>
                    {details && (
                      <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-black/30 p-3 text-[11px] leading-relaxed text-neutral-300">
                        {details}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
