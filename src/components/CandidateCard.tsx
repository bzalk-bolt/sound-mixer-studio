import { useEffect, useMemo, useState } from 'react';
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
  onReprocess: (adjustments: MasteringAdjustments, cleanAudio: boolean) => void;
  isReprocessing: boolean;
  rank: number;
}

const fallbackSettings: MasteringAdjustments = {
  brightness: 0,
  warmth: 0,
  presence: 0,
  bass: 0,
  low_mid: 0,
  air: 0,
  stereo_width: 0,
  cleanup: 0.06,
  cleanup_gate: -45,
  cleanup_noise: 0,
  loudness: -10.5,
  volume_db: 0,
  input_gain_db: 0,
  compression: 1.4,
  compression_threshold: -20,
  compression_attack: 20,
  compression_release: 120,
  compression_mix: 0.85,
  saturation: 0,
  limiter: -1.5,
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
  digits = 1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  digits?: number;
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
      <span className="text-right tabular-nums text-neutral-400">{value.toFixed(digits)}</span>
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
  const baseSettings = useMemo(
    () => ({ ...fallbackSettings, ...(candidate.control_settings || candidate.last_adjustments || {}) }),
    [candidate.control_settings, candidate.last_adjustments],
  );
  const [adjustments, setAdjustments] = useState<MasteringAdjustments>(baseSettings);
  const [cleanAudio, setCleanAudio] = useState(Boolean(candidate.voice_cleaning?.enabled));
  const mutedSeconds = candidate.voice_cleaning?.analysis?.muted_seconds;

  useEffect(() => {
    setAdjustments(baseSettings);
  }, [baseSettings]);

  useEffect(() => {
    setCleanAudio(Boolean(candidate.voice_cleaning?.enabled));
  }, [candidate.voice_cleaning?.enabled]);

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

        {candidate.voice_cleaning?.enabled && (
          <div className="mb-4 rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-2.5 py-2 text-[10px] text-emerald-300">
            Clean audio applied
            {typeof mutedSeconds === 'number' && Number.isFinite(mutedSeconds)
              ? ` - ${mutedSeconds.toFixed(1)}s muted`
              : ''}
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
            <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Level</div>
            <AdjustmentSlider label="Vol dB" value={adjustments.volume_db} min={-12} max={12} step={0.5} onChange={(value) => setAdjustment('volume_db', value)} />
            <AdjustmentSlider label="Input dB" value={adjustments.input_gain_db} min={-6} max={6} step={0.5} onChange={(value) => setAdjustment('input_gain_db', value)} />
            <AdjustmentSlider label="LUFS" value={adjustments.loudness} min={-16} max={-8} step={0.1} onChange={(value) => setAdjustment('loudness', value)} />

            <div className="pt-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Tone</div>
            <AdjustmentSlider label="Bright" value={adjustments.brightness} min={-4.5} max={4.5} step={0.1} onChange={(value) => setAdjustment('brightness', value)} />
            <AdjustmentSlider label="Warmth" value={adjustments.warmth} min={-4.5} max={4.5} step={0.1} onChange={(value) => setAdjustment('warmth', value)} />
            <AdjustmentSlider label="Presence" value={adjustments.presence} min={-4.5} max={4.5} step={0.1} onChange={(value) => setAdjustment('presence', value)} />
            <AdjustmentSlider label="Bass" value={adjustments.bass} min={-4.5} max={4.5} step={0.1} onChange={(value) => setAdjustment('bass', value)} />
            <AdjustmentSlider label="Low Mid" value={adjustments.low_mid} min={-4.5} max={4.5} step={0.1} onChange={(value) => setAdjustment('low_mid', value)} />
            <AdjustmentSlider label="Air" value={adjustments.air} min={-4.5} max={4.5} step={0.1} onChange={(value) => setAdjustment('air', value)} />

            <div className="pt-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Dynamics</div>
            <AdjustmentSlider label="Ratio" value={adjustments.compression} min={1.1} max={3} step={0.1} onChange={(value) => setAdjustment('compression', value)} />
            <AdjustmentSlider label="Thresh" value={adjustments.compression_threshold} min={-30} max={-10} step={0.5} onChange={(value) => setAdjustment('compression_threshold', value)} />
            <AdjustmentSlider label="Attack" value={adjustments.compression_attack} min={5} max={80} step={1} digits={0} onChange={(value) => setAdjustment('compression_attack', value)} />
            <AdjustmentSlider label="Release" value={adjustments.compression_release} min={50} max={300} step={5} digits={0} onChange={(value) => setAdjustment('compression_release', value)} />
            <AdjustmentSlider label="Comp Mix" value={adjustments.compression_mix} min={0.35} max={1} step={0.05} digits={2} onChange={(value) => setAdjustment('compression_mix', value)} />
            <AdjustmentSlider label="Saturate" value={adjustments.saturation} min={0} max={0.08} step={0.005} digits={3} onChange={(value) => setAdjustment('saturation', value)} />
            <AdjustmentSlider label="Limiter" value={adjustments.limiter} min={-3} max={-1.5} step={0.1} onChange={(value) => setAdjustment('limiter', value)} />

            <div className="pt-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Space & Cleanup</div>
            <AdjustmentSlider label="Stereo" value={adjustments.stereo_width} min={0} max={0.18} step={0.005} digits={3} onChange={(value) => setAdjustment('stereo_width', value)} />
            <AdjustmentSlider label="Gate Rng" value={adjustments.cleanup} min={0.003} max={0.2} step={0.005} digits={3} onChange={(value) => setAdjustment('cleanup', value)} />
            <AdjustmentSlider label="Gate dB" value={adjustments.cleanup_gate} min={-60} max={-28} step={0.5} onChange={(value) => setAdjustment('cleanup_gate', value)} />
            <AdjustmentSlider label="Denoise" value={adjustments.cleanup_noise} min={0} max={24} step={0.5} onChange={(value) => setAdjustment('cleanup_noise', value)} />
            <AdjustmentSlider label="Reverb" value={adjustments.ambience} min={0} max={0.35} step={0.005} digits={3} onChange={(value) => setAdjustment('ambience', value)} />

            <label className="mt-2 flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-2 text-xs text-neutral-300">
              <input
                type="checkbox"
                checked={cleanAudio}
                onChange={(event) => setCleanAudio(event.target.checked)}
                disabled={isReprocessing}
                className="mt-0.5 h-3.5 w-3.5 accent-cyan-400"
              />
              <span>
                <span className="block font-medium text-neutral-200">Clean Audio</span>
                <span className="block text-[10px] leading-4 text-neutral-500">
                  Mute non-vocal background noise after rendering.
                </span>
              </span>
            </label>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setAdjustments(baseSettings);
                  setCleanAudio(Boolean(candidate.voice_cleaning?.enabled));
                }}
                disabled={isReprocessing}
                className="text-xs text-neutral-500 hover:text-neutral-300 disabled:opacity-40"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => onReprocess(adjustments, cleanAudio)}
                disabled={isReprocessing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReprocessing ? 'animate-spin' : ''}`} />
                {isReprocessing ? (cleanAudio ? 'Cleaning' : 'Rendering') : 'Reprocess'}
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
