import { useEffect, useMemo, useState } from 'react';
import type { Candidate, MasteringAdjustments } from '../types/mastering';
import { RefreshCw, SlidersHorizontal, Wand2, Save, ChevronDown, ChevronUp } from 'lucide-react';

interface CustomCandidateCardProps {
  baseCandidate: Candidate;
  onReprocessClip: (adjustments: MasteringAdjustments, cleanAudio: boolean) => void;
  onSaveAsCandidate: (name: string, adjustments: MasteringAdjustments) => void;
  isReprocessing: boolean;
  hasClipResult: boolean;
}

const fallbackSettings: MasteringAdjustments = {
  brightness: 0,
  warmth: 0,
  presence: 0,
  bass: 0,
  low_mid: 0,
  air: 0,
  de_ess: 0,
  harshness: 0,
  boxiness: 0,
  body: 0,
  mono_bass: 0,
  dynamic_eq: 0,
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

export function CustomCandidateCard({
  baseCandidate,
  onReprocessClip,
  onSaveAsCandidate,
  isReprocessing,
  hasClipResult,
}: CustomCandidateCardProps) {
  const baseSettings = useMemo(
    () => ({ ...fallbackSettings, ...(baseCandidate.control_settings || baseCandidate.last_adjustments || {}) }),
    [baseCandidate.control_settings, baseCandidate.last_adjustments],
  );
  const [adjustments, setAdjustments] = useState<MasteringAdjustments>(baseSettings);
  const [showControls, setShowControls] = useState(true);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [cleanAudio, setCleanAudio] = useState(Boolean(baseCandidate.voice_cleaning?.enabled));

  useEffect(() => {
    setAdjustments(baseSettings);
  }, [baseSettings]);

  useEffect(() => {
    setCleanAudio(Boolean(baseCandidate.voice_cleaning?.enabled));
  }, [baseCandidate.voice_cleaning?.enabled]);

  const setAdjustment = (key: keyof MasteringAdjustments, value: number) => {
    setAdjustments((current) => ({ ...current, [key]: value }));
  };

  const handleSave = () => {
    if (saveName.trim()) {
      onSaveAsCandidate(saveName.trim(), adjustments);
      setShowSaveInput(false);
      setSaveName('');
    }
  };

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/[0.03] to-transparent overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Custom Remix</h3>
              <p className="text-[10px] text-neutral-500">
                Tweak settings and reprocess your clip to hear changes instantly
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowControls((c) => !c)}
              className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06]"
            >
              <SlidersHorizontal className="w-3 h-3" />
              Controls
              {showControls ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {showControls && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg border border-white/[0.06] bg-black/20 p-4">
            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Level</div>
              <AdjustmentSlider label="Vol dB" value={adjustments.volume_db} min={-12} max={12} step={0.5} onChange={(v) => setAdjustment('volume_db', v)} />
              <AdjustmentSlider label="Input dB" value={adjustments.input_gain_db} min={-6} max={6} step={0.5} onChange={(v) => setAdjustment('input_gain_db', v)} />
              <AdjustmentSlider label="LUFS" value={adjustments.loudness} min={-16} max={-8} step={0.1} onChange={(v) => setAdjustment('loudness', v)} />
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Tone</div>
              <AdjustmentSlider label="Bright" value={adjustments.brightness} min={-4.5} max={4.5} step={0.1} onChange={(v) => setAdjustment('brightness', v)} />
              <AdjustmentSlider label="Warmth" value={adjustments.warmth} min={-4.5} max={4.5} step={0.1} onChange={(v) => setAdjustment('warmth', v)} />
              <AdjustmentSlider label="Presence" value={adjustments.presence} min={-4.5} max={4.5} step={0.1} onChange={(v) => setAdjustment('presence', v)} />
              <AdjustmentSlider label="Bass" value={adjustments.bass} min={-4.5} max={4.5} step={0.1} onChange={(v) => setAdjustment('bass', v)} />
              <AdjustmentSlider label="Low Mid" value={adjustments.low_mid} min={-4.5} max={4.5} step={0.1} onChange={(v) => setAdjustment('low_mid', v)} />
              <AdjustmentSlider label="Body" value={adjustments.body} min={-4.5} max={4.5} step={0.1} onChange={(v) => setAdjustment('body', v)} />
              <AdjustmentSlider label="Boxy" value={adjustments.boxiness} min={-4.5} max={4.5} step={0.1} onChange={(v) => setAdjustment('boxiness', v)} />
              <AdjustmentSlider label="Harsh" value={adjustments.harshness} min={-4.5} max={4.5} step={0.1} onChange={(v) => setAdjustment('harshness', v)} />
              <AdjustmentSlider label="Air" value={adjustments.air} min={-4.5} max={4.5} step={0.1} onChange={(v) => setAdjustment('air', v)} />
              <AdjustmentSlider label="De-ess" value={adjustments.de_ess} min={0} max={1} step={0.05} digits={2} onChange={(v) => setAdjustment('de_ess', v)} />
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Dynamics</div>
              <AdjustmentSlider label="Ratio" value={adjustments.compression} min={1.1} max={3} step={0.1} onChange={(v) => setAdjustment('compression', v)} />
              <AdjustmentSlider label="Thresh" value={adjustments.compression_threshold} min={-30} max={-10} step={0.5} onChange={(v) => setAdjustment('compression_threshold', v)} />
              <AdjustmentSlider label="Attack" value={adjustments.compression_attack} min={5} max={80} step={1} digits={0} onChange={(v) => setAdjustment('compression_attack', v)} />
              <AdjustmentSlider label="Release" value={adjustments.compression_release} min={50} max={300} step={5} digits={0} onChange={(v) => setAdjustment('compression_release', v)} />
              <AdjustmentSlider label="Comp Mix" value={adjustments.compression_mix} min={0.35} max={1} step={0.05} digits={2} onChange={(v) => setAdjustment('compression_mix', v)} />
              <AdjustmentSlider label="Dyn EQ" value={adjustments.dynamic_eq} min={0} max={1} step={0.05} digits={2} onChange={(v) => setAdjustment('dynamic_eq', v)} />
              <AdjustmentSlider label="Saturate" value={adjustments.saturation} min={0} max={0.08} step={0.005} digits={3} onChange={(v) => setAdjustment('saturation', v)} />
              <AdjustmentSlider label="Limiter" value={adjustments.limiter} min={-3} max={-1.5} step={0.1} onChange={(v) => setAdjustment('limiter', v)} />
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Space & Cleanup</div>
              <AdjustmentSlider label="Stereo" value={adjustments.stereo_width} min={0} max={0.18} step={0.005} digits={3} onChange={(v) => setAdjustment('stereo_width', v)} />
              <AdjustmentSlider label="Mono Bass" value={adjustments.mono_bass} min={0} max={1} step={0.05} digits={2} onChange={(v) => setAdjustment('mono_bass', v)} />
              <AdjustmentSlider label="Gate Rng" value={adjustments.cleanup} min={0.003} max={0.2} step={0.005} digits={3} onChange={(v) => setAdjustment('cleanup', v)} />
              <AdjustmentSlider label="Gate dB" value={adjustments.cleanup_gate} min={-60} max={-28} step={0.5} onChange={(v) => setAdjustment('cleanup_gate', v)} />
              <AdjustmentSlider label="Denoise" value={adjustments.cleanup_noise} min={0} max={24} step={0.5} onChange={(v) => setAdjustment('cleanup_noise', v)} />
              <AdjustmentSlider label="Reverb" value={adjustments.ambience} min={0} max={0.35} step={0.005} digits={3} onChange={(v) => setAdjustment('ambience', v)} />
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
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mt-4">
          <button
            type="button"
            onClick={() => {
              setAdjustments(baseSettings);
              setCleanAudio(Boolean(baseCandidate.voice_cleaning?.enabled));
            }}
            disabled={isReprocessing}
            className="text-xs text-neutral-500 hover:text-neutral-300 disabled:opacity-40 transition-colors"
          >
            Reset to base
          </button>

          <div className="flex items-center gap-2">
            {hasClipResult && !showSaveInput && (
              <button
                type="button"
                onClick={() => setShowSaveInput(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg transition-all"
              >
                <Save className="w-3 h-3" />
                Save as Candidate
              </button>
            )}
            <button
              type="button"
              onClick={() => onReprocessClip(adjustments, cleanAudio)}
              disabled={isReprocessing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-black hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReprocessing ? 'animate-spin' : ''}`} />
              {isReprocessing ? (cleanAudio ? 'Cleaning...' : 'Processing...') : 'Process Clip'}
            </button>
          </div>
        </div>

        {showSaveInput && (
          <div className="mt-3 flex items-center gap-2 animate-in fade-in duration-200">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Name your custom master..."
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500/40"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={!saveName.trim()}
              className="px-3 py-1.5 text-xs font-medium text-black bg-cyan-500 hover:bg-cyan-400 rounded-lg disabled:opacity-40 transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => { setShowSaveInput(false); setSaveName(''); }}
              className="px-2 py-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
