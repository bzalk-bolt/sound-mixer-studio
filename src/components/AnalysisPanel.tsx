import { SourceAnalysis } from '../types/mastering';

interface AnalysisPanelProps {
  analysis: SourceAnalysis;
}

function MeterBar({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = Math.min(Math.max(((value - max) / (-max)) * 100, 0), 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-neutral-500 uppercase tracking-wider w-16 text-right shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-neutral-400 tabular-nums w-12">{value.toFixed(1)} dB</span>
    </div>
  );
}

export function AnalysisPanel({ analysis }: AnalysisPanelProps) {
  const spectrumBands = [
    { key: 'sub_20_60', label: 'Sub', value: analysis.spectrum.sub_20_60 },
    { key: 'bass_60_120', label: 'Bass', value: analysis.spectrum.bass_60_120 },
    { key: 'low_mid_120_300', label: 'Low Mid', value: analysis.spectrum.low_mid_120_300 },
    { key: 'mid_300_1000', label: 'Mid', value: analysis.spectrum.mid_300_1000 },
    { key: 'presence_1000_4000', label: 'Presence', value: analysis.spectrum.presence_1000_4000 },
    { key: 'harsh_4000_8000', label: 'High', value: analysis.spectrum.harsh_4000_8000 },
    { key: 'air_8000_16000', label: 'Air', value: analysis.spectrum.air_8000_16000 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
        <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-3">Loudness</h4>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-xs text-neutral-500">Integrated</span>
            <span className="text-xs text-white font-medium tabular-nums">{analysis.loudness.integrated_lufs} LUFS</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-neutral-500">True Peak</span>
            <span className="text-xs text-white font-medium tabular-nums">{analysis.loudness.true_peak_db} dBTP</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-neutral-500">LRA</span>
            <span className="text-xs text-white font-medium tabular-nums">{analysis.loudness.lra} LU</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-neutral-500">Crest Factor</span>
            <span className="text-xs text-white font-medium tabular-nums">{analysis.loudness.crest_factor} dB</span>
          </div>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
        <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-3">Spectrum</h4>
        <div className="space-y-2">
          {spectrumBands.map((band) => (
            <MeterBar
              key={band.key}
              label={band.label}
              value={band.value}
              max={-30}
              color="bg-gradient-to-r from-cyan-600 to-teal-500"
            />
          ))}
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
        <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-3">Dynamics & Stereo</h4>
        <div className="space-y-3 mb-4">
          <div className="flex justify-between">
            <span className="text-xs text-neutral-500">Stereo Width</span>
            <span className="text-xs text-white font-medium tabular-nums">{(analysis.stereo.width_score * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-neutral-500">Mono Correlation</span>
            <span className="text-xs text-white font-medium tabular-nums">{analysis.stereo.mono_correlation.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-neutral-500">Transient Density</span>
            <span className="text-xs text-white font-medium tabular-nums">{(analysis.dynamics.transient_density * 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-neutral-500">Compression</span>
            <span className="text-xs text-white font-medium capitalize">{analysis.dynamics.compression_guess.replace('_', ' ')}</span>
          </div>
        </div>
        {analysis.classification && (
          <>
            <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2 mt-4">Classification</h4>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 text-[10px] bg-white/5 border border-white/10 rounded-full text-neutral-300 capitalize">
                {analysis.classification.genre_guess}
              </span>
              {analysis.classification.mix_problem_tags?.map((tag) => (
                <span key={tag} className="px-2 py-0.5 text-[10px] bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400">
                  {tag.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
