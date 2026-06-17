import { useState } from 'react';
import { Candidate, MasteringAdjustments } from '../types/mastering';
import { AudioPlayer } from './AudioPlayer';
import { Award, FileText, RefreshCw, SlidersHorizontal, Zap, Sun, Volume2 } from 'lucide-react';

interface CandidateCardProps {
  candidate: Candidate;
  isSelected: boolean;
  isPlaying: boolean;
  onSelect: () => void;
  onPlay: () => void;
  onShowLogs: () => void;
  onReprocess: (adjustments: MasteringAdjustments) => void;
  isReprocessing: boolean;
  rank: number;
}

const neutralAdjustments: MasteringAdjustments = {
  brightness: 0,
  warmth: 0,
  presence: 0,
  stereo_width: 0,
  cleanup: 0,
  loudness: 0,
  ambience: 0,
};

function getStyleIcon(style: string) {
  switch (style) {
    case 'warm': return <Sun className="w-4 h-4" />;
    case 'balanced': return <Award className="w-4 h-4" />;
    case 'open': return <Zap className="w-4 h-4" />;
    default: return <Volume2 className="w-4 h-4" />;
  }
}

function getCandidateLabel(style: string, loudness: string): string {
  const styleLabels: Record<string, string> = {
    warm: 'Warm',
    balanced: 'Balanced',
    open: 'Open / Bright',
  };
  const loudnessLabels: Record<string, string> = {
    conservative: 'Natural',
    standard: 'Standard',
    loud: 'Loud',
  };
  const s = styleLabels[style] || style;
  const l = loudnessLabels[loudness] || loudness;
  return `${s} / ${l}`;
}

function getScoreColor(score: number): string {
  if (score >= 85) return 'text-emerald-400';
  if (score >= 70) return 'text-amber-400';
  return 'text-red-400';
}

function formatNumber(value: number | null | undefined, digits = 1): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '--';
}

function AdjustmentSlider({
  label,
  value,
  min = -1,
  max = 1,
  step = 0.1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid grid-cols-[72px_1fr_34px] items-center gap-2 text-[10px] text-neutral-500">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-cyan-400"
      />
      <span className="text-right tabular-nums text-neutral-400">{value.toFixed(1)}</span>
    </label>
  );
}

export function CandidateCard({
  candidate,
  isSelected,
  isPlaying,
  onSelect,
  onPlay,
  onShowLogs,
  onReprocess,
  isReprocessing,
  rank,
}: CandidateCardProps) {
  const analysis = candidate.post_analysis;
  const stereoAssessment = analysis?.stereo?.stereo_assessment?.replace(/_/g, ' ');
  const [showControls, setShowControls] = useState(false);
  const [adjustments, setAdjustments] = useState<MasteringAdjustments>(
    candidate.last_adjustments || neutralAdjustments,
  );

  const setAdjustment = (key: keyof MasteringAdjustments, value: number) => {
    setAdjustments((current) => ({ ...current, [key]: value }));
  };

  return (
    <div
      onClick={onSelect}
      className={`relative rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden ${
        isSelected
          ? 'border-cyan-500/60 bg-cyan-500/5 shadow-[0_0_24px_-4px_rgba(6,182,212,0.15)]'
          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
      }`}
    >
      {rank === 1 && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
          <Award className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Top Pick</span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isSelected ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-neutral-400'
          }`}>
            {getStyleIcon(candidate.style)}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              {getCandidateLabel(candidate.style, candidate.loudness)}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-bold tabular-nums ${getScoreColor(candidate.score)}`}>
                {candidate.score.toFixed(1)}
              </span>
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Score</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-white/[0.03] rounded-lg p-2 text-center">
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">Spectral</div>
            <div className="text-xs text-neutral-300 font-medium">
              {candidate.score_breakdown.spectral_distance_from_target.toFixed(2)}
            </div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2 text-center">
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">Harsh</div>
            <div className="text-xs text-neutral-300 font-medium">
              {candidate.score_breakdown.harshness_score.toFixed(2)}
            </div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2 text-center">
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">Compress</div>
            <div className="text-xs text-neutral-300 font-medium capitalize">
              {candidate.score_breakdown.overcompression_risk}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-black/20 rounded-lg p-2 text-center">
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">LUFS</div>
            <div className="text-xs text-neutral-300 font-medium tabular-nums">
              {formatNumber(analysis?.loudness?.integrated_lufs)}
            </div>
          </div>
          <div className="bg-black/20 rounded-lg p-2 text-center">
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">TP</div>
            <div className="text-xs text-neutral-300 font-medium tabular-nums">
              {formatNumber(analysis?.loudness?.true_peak_db)}
            </div>
          </div>
          <div className="bg-black/20 rounded-lg p-2 text-center">
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">Width</div>
            <div className="text-xs text-neutral-300 font-medium tabular-nums">
              {formatNumber((analysis?.stereo?.width_score ?? 0) * 100, 0)}%
            </div>
          </div>
          <div className="bg-black/20 rounded-lg p-2 text-center">
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">Corr</div>
            <div className="text-xs text-neutral-300 font-medium tabular-nums">
              {formatNumber(analysis?.stereo?.mono_correlation, 2)}
            </div>
          </div>
        </div>

        {stereoAssessment && (
          <div className="mb-4 text-[10px] text-neutral-500 capitalize">
            Stereo: {stereoAssessment}
          </div>
        )}

        <AudioPlayer
          src={candidate.preview_file.storage_url}
          label="Preview"
          isActive={isPlaying}
          onPlay={onPlay}
        />
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setShowControls((current) => !current);
            }}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Adjust
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onShowLogs();
            }}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Logs
          </button>
        </div>

        {showControls && (
          <div
            className="mt-4 space-y-2 rounded-lg border border-white/[0.06] bg-black/20 p-3"
            onClick={(event) => event.stopPropagation()}
          >
            <AdjustmentSlider label="Bright" value={adjustments.brightness} onChange={(value) => setAdjustment('brightness', value)} />
            <AdjustmentSlider label="Warmth" value={adjustments.warmth} onChange={(value) => setAdjustment('warmth', value)} />
            <AdjustmentSlider label="Presence" value={adjustments.presence} onChange={(value) => setAdjustment('presence', value)} />
            <AdjustmentSlider label="Stereo" value={adjustments.stereo_width} onChange={(value) => setAdjustment('stereo_width', value)} />
            <AdjustmentSlider label="Cleanup" value={adjustments.cleanup} onChange={(value) => setAdjustment('cleanup', value)} />
            <AdjustmentSlider label="Loudness" value={adjustments.loudness} onChange={(value) => setAdjustment('loudness', value)} />
            <AdjustmentSlider label="Reverb" value={adjustments.ambience} min={0} max={1} onChange={(value) => setAdjustment('ambience', value)} />
            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustments(neutralAdjustments)}
                disabled={isReprocessing}
                className="text-xs text-neutral-500 hover:text-neutral-300 disabled:opacity-40"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => onReprocess(adjustments)}
                disabled={isReprocessing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReprocessing ? 'animate-spin' : ''}`} />
                {isReprocessing ? 'Rendering' : 'Reprocess'}
              </button>
            </div>
          </div>
        )}
      </div>

      {isSelected && (
        <div className="px-5 pb-4">
          <div className="h-px bg-white/[0.06] mb-3" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs text-cyan-400 font-medium">Selected for mastering</span>
          </div>
        </div>
      )}
    </div>
  );
}
