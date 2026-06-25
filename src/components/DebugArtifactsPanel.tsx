import { useEffect, useMemo, useState } from 'react';
import { Activity, Bug, ExternalLink } from 'lucide-react';
import { AudioPlayer } from './AudioPlayer';
import type { DebugArtifacts, DebugStageArtifact } from '../types/mastering';

interface WaveformPoint {
  time_seconds: number;
  peak: number;
  rms_db?: number | null;
}

interface WaveformJson {
  label?: string;
  duration_seconds?: number;
  points?: WaveformPoint[];
  summary?: {
    peak?: number | null;
    rms_db_p50?: number | null;
    rms_db_p75?: number | null;
  };
}

interface DebugArtifactsPanelProps {
  artifacts: DebugArtifacts | null;
}

function formatDb(value?: number | null) {
  return typeof value === 'number' ? `${value.toFixed(1)} dB` : 'n/a';
}

function formatPeak(value?: number | null) {
  return typeof value === 'number' ? value.toFixed(3) : 'n/a';
}

function WaveformBars({ data, tone }: { data: WaveformJson | null; tone: 'neutral' | 'cyan' }) {
  const points = data?.points || [];
  const bars = points.length > 160
    ? points.filter((_, index) => index % Math.ceil(points.length / 160) === 0)
    : points;
  const color = tone === 'cyan' ? 'bg-cyan-400' : 'bg-neutral-500';

  return (
    <div className="h-20 flex items-center gap-px overflow-hidden rounded-md bg-black/20 border border-white/[0.04] px-2">
      {bars.length === 0 ? (
        <div className="text-xs text-neutral-500">Waveform pending</div>
      ) : (
        bars.map((point, index) => (
          <div
            key={`${point.time_seconds}-${index}`}
            className={`w-1 min-w-1 rounded-full ${color}`}
            style={{ height: `${Math.max(4, Math.min(100, point.peak * 100))}%`, opacity: 0.35 + Math.min(0.55, point.peak) }}
          />
        ))
      )}
    </div>
  );
}

function StageSummary({ stage }: { stage: DebugStageArtifact }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-[11px] text-neutral-500">
      <div>
        <span className="block uppercase tracking-wider">Peak</span>
        <span className="text-neutral-300 tabular-nums">{formatPeak(stage.summary?.peak)}</span>
      </div>
      <div>
        <span className="block uppercase tracking-wider">RMS p50</span>
        <span className="text-neutral-300 tabular-nums">{formatDb(stage.summary?.rms_db_p50)}</span>
      </div>
      <div>
        <span className="block uppercase tracking-wider">RMS p75</span>
        <span className="text-neutral-300 tabular-nums">{formatDb(stage.summary?.rms_db_p75)}</span>
      </div>
    </div>
  );
}

export function DebugArtifactsPanel({ artifacts }: DebugArtifactsPanelProps) {
  const stages = useMemo(() => artifacts?.stages || [], [artifacts]);
  const [selectedKey, setSelectedKey] = useState('');
  const [playingKey, setPlayingKey] = useState('');
  const [stageWaveform, setStageWaveform] = useState<WaveformJson | null>(null);
  const [originalWaveform, setOriginalWaveform] = useState<WaveformJson | null>(null);
  const selectedStage = stages.find((stage) => stage.key === selectedKey) || stages[0] || null;
  const isMasteringDebug = artifacts?.kind === 'mastering_stage_feedback';
  const title = isMasteringDebug ? 'Mastering Debug' : 'Stage Debug';
  const originalLabel = isMasteringDebug ? 'Original source waveform' : 'Original waveform';

  useEffect(() => {
    if (!selectedStage && selectedKey) {
      setSelectedKey('');
      return;
    }
    if (!selectedKey && selectedStage) {
      setSelectedKey(selectedStage.key);
    }
  }, [selectedKey, selectedStage]);

  useEffect(() => {
    let cancelled = false;
    async function loadWaveforms() {
      setStageWaveform(null);
      setOriginalWaveform(null);
      if (!selectedStage?.waveform?.storage_url) return;

      const originalUrl = artifacts?.base?.original_source_waveform?.storage_url
        || artifacts?.base?.original_vocal_waveform?.storage_url;
      try {
        const [stageResponse, originalResponse] = await Promise.all([
          fetch(selectedStage.waveform.storage_url),
          originalUrl ? fetch(originalUrl) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        if (stageResponse.ok) {
          setStageWaveform(await stageResponse.json());
        }
        if (originalResponse && originalResponse.ok) {
          setOriginalWaveform(await originalResponse.json());
        }
      } catch {
        if (!cancelled) {
          setStageWaveform(null);
          setOriginalWaveform(null);
        }
      }
    }
    loadWaveforms();
    return () => {
      cancelled = true;
    };
  }, [artifacts, selectedStage]);

  if (!artifacts || artifacts.enabled === false) return null;

  return (
    <section className="space-y-4 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-cyan-400" />
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <p className="text-xs text-neutral-500">Stage mixes and waveform JSON are loaded from public server URLs.</p>
          </div>
        </div>
        <div className="text-[11px] text-neutral-500 tabular-nums">{stages.length} stages</div>
      </div>

      {artifacts.error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {artifacts.error}
        </div>
      )}

      {stages.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-4 text-sm text-neutral-400">
          <Activity className="w-4 h-4 animate-pulse text-cyan-400" />
          Waiting for stage renders...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          <div className="space-y-2">
            {stages.map((stage) => (
              <button
                key={stage.key}
                onClick={() => setSelectedKey(stage.key)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                  selectedStage?.key === stage.key
                    ? 'border-cyan-400/40 bg-cyan-400/10'
                    : 'border-white/[0.06] bg-black/20 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white">{stage.order}. {stage.label}</span>
                  <a
                    href={stage.mix.storage_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="text-neutral-500 hover:text-cyan-300"
                    aria-label={`Open ${stage.label} mix`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="mt-2">
                  <StageSummary stage={stage} />
                </div>
              </button>
            ))}
          </div>

          {selectedStage && (
            <div className="space-y-4 rounded-lg border border-white/[0.06] bg-black/20 p-4">
              <AudioPlayer
                src={selectedStage.mix.storage_url}
                label={`${selectedStage.order}. ${selectedStage.label} mix`}
                isActive={playingKey === selectedStage.key}
                onPlay={() => setPlayingKey(selectedStage.key)}
              />

              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-neutral-500">{originalLabel}</span>
                    <span className="text-[11px] text-neutral-500">{formatDb(originalWaveform?.summary?.rms_db_p75)}</span>
                  </div>
                  <WaveformBars data={originalWaveform} tone="neutral" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-neutral-500">{selectedStage.label} mix waveform</span>
                    <span className="text-[11px] text-neutral-500">{formatDb(stageWaveform?.summary?.rms_db_p75)}</span>
                  </div>
                  <WaveformBars data={stageWaveform} tone="cyan" />
                </div>
              </div>

              {selectedStage.stage_filters && selectedStage.stage_filters.length > 0 && (
                <div className="rounded-md bg-black/30 border border-white/[0.04] p-3">
                  <div className="mb-2 text-[11px] uppercase tracking-wider text-neutral-500">Stage filters</div>
                  <code className="block whitespace-pre-wrap break-words text-[11px] leading-relaxed text-neutral-300">
                    {selectedStage.stage_filters.join(', ')}
                  </code>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
