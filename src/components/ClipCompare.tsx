import { useRef, useEffect, useState, useCallback } from 'react';
import { clipService } from '../services';
import { Play, Pause, X, Headphones, ArrowRightLeft, Sparkles, Loader2 } from 'lucide-react';

interface ClipCompareProps {
  originalUrl: string;
  processedUrl: string;
  regionStart: number;
  regionEnd: number;
  onClose: () => void;
  onApplyFullSong: () => void;
  isApplying: boolean;
  isReprocessing: boolean;
  candidateLabel: string;
  settingsSummary: string;
}

export function ClipCompare({
  originalUrl,
  processedUrl,
  regionStart,
  regionEnd,
  onClose,
  onApplyFullSong,
  isApplying,
  isReprocessing,
  candidateLabel,
  settingsSummary,
}: ClipCompareProps) {
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalAudioRef = useRef<HTMLAudioElement>(null);
  const processedAudioRef = useRef<HTMLAudioElement>(null);
  const [dividerPosition, setDividerPosition] = useState(50);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);
  const [playMode, setPlayMode] = useState<'none' | 'original' | 'processed' | 'split'>('none');
  const [originalPeaks, setOriginalPeaks] = useState<Float32Array | null>(null);
  const [processedPeaks, setProcessedPeaks] = useState<Float32Array | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const clipDuration = regionEnd - regionStart;
  const containerRef = useRef<HTMLDivElement>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const originalSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const processedSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const originalPanRef = useRef<StereoPannerNode | null>(null);
  const processedPanRef = useRef<StereoPannerNode | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    clipService.decodeAudioPeaks(processedUrl, 400).then((result) => {
      setProcessedPeaks(result.peaks);
    }).catch(() => {});
  }, [processedUrl]);

  useEffect(() => {
    clipService.decodeAudioPeaks(originalUrl, 400).then((result) => {
      setOriginalPeaks(result.peaks);
    }).catch(() => {});
  }, [originalUrl]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  const drawPeaks = useCallback((canvas: HTMLCanvasElement | null, peaks: Float32Array | null, color: string) => {
    if (!canvas || !peaks) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const barWidth = width / peaks.length;
    const midY = height / 2;

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < peaks.length; i++) {
      const x = i * barWidth;
      const barH = Math.max(1, peaks[i] * height * 0.85);
      ctx.fillStyle = color;
      ctx.fillRect(x, midY - barH / 2, Math.max(1, barWidth - 0.5), barH);
    }

    if (clipDuration > 0 && playMode !== 'none') {
      const playX = (currentTime / clipDuration) * width;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(playX, 0);
      ctx.lineTo(playX, height);
      ctx.stroke();
    }
  }, [clipDuration, currentTime, playMode]);

  useEffect(() => {
    drawPeaks(originalCanvasRef.current, originalPeaks, 'rgba(251, 191, 36, 0.5)');
    drawPeaks(processedCanvasRef.current, processedPeaks, 'rgba(6, 182, 212, 0.6)');
  }, [drawPeaks, originalPeaks, processedPeaks]);

  function setupAudioGraph() {
    if (audioCtxRef.current) return;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    if (originalAudioRef.current && !originalSourceRef.current) {
      const src = ctx.createMediaElementSource(originalAudioRef.current);
      const pan = ctx.createStereoPanner();
      src.connect(pan).connect(ctx.destination);
      originalSourceRef.current = src;
      originalPanRef.current = pan;
    }

    if (processedAudioRef.current && !processedSourceRef.current) {
      const src = ctx.createMediaElementSource(processedAudioRef.current);
      const pan = ctx.createStereoPanner();
      src.connect(pan).connect(ctx.destination);
      processedSourceRef.current = src;
      processedPanRef.current = pan;
    }
  }

  function clearTimers() {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function startTimeTracking(mode: 'original' | 'processed' | 'split') {
    function tick() {
      if (mode === 'original' || mode === 'split') {
        if (originalAudioRef.current) {
          setCurrentTime(originalAudioRef.current.currentTime - regionStart);
        }
      } else if (processedAudioRef.current) {
        setCurrentTime(processedAudioRef.current.currentTime);
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  function stopAll() {
    clearTimers();
    originalAudioRef.current?.pause();
    processedAudioRef.current?.pause();
    setPlayMode('none');
  }

  function playOriginal() {
    setupAudioGraph();
    stopAll();
    if (originalPanRef.current) originalPanRef.current.pan.value = 0;
    if (processedPanRef.current) processedPanRef.current.pan.value = 0;
    if (originalAudioRef.current) {
      originalAudioRef.current.currentTime = regionStart;
      originalAudioRef.current.play();
      const durationMs = (regionEnd - regionStart) * 1000;
      stopTimerRef.current = window.setTimeout(() => {
        originalAudioRef.current?.pause();
        setPlayMode('none');
        setCurrentTime(0);
        clearTimers();
      }, durationMs);
    }
    setPlayMode('original');
    startTimeTracking('original');
  }

  function playProcessed() {
    setupAudioGraph();
    stopAll();
    if (originalPanRef.current) originalPanRef.current.pan.value = 0;
    if (processedPanRef.current) processedPanRef.current.pan.value = 0;
    if (processedAudioRef.current) {
      processedAudioRef.current.currentTime = 0;
      processedAudioRef.current.play();
      const durationMs = (regionEnd - regionStart) * 1000;
      stopTimerRef.current = window.setTimeout(() => {
        processedAudioRef.current?.pause();
        setPlayMode('none');
        setCurrentTime(0);
        clearTimers();
      }, durationMs);
    }
    setPlayMode('processed');
    startTimeTracking('processed');
  }

  function playSplit() {
    setupAudioGraph();
    stopAll();
    if (originalPanRef.current) originalPanRef.current.pan.value = -1;
    if (processedPanRef.current) processedPanRef.current.pan.value = 1;
    if (originalAudioRef.current) {
      originalAudioRef.current.currentTime = regionStart;
      originalAudioRef.current.play();
    }
    if (processedAudioRef.current) {
      processedAudioRef.current.currentTime = 0;
      processedAudioRef.current.play();
    }
    const durationMs = (regionEnd - regionStart) * 1000;
    stopTimerRef.current = window.setTimeout(() => {
      originalAudioRef.current?.pause();
      processedAudioRef.current?.pause();
      setPlayMode('none');
      setCurrentTime(0);
      clearTimers();
    }, durationMs);
    setPlayMode('split');
    startTimeTracking('split');
  }

  function handleEnded() {
    clearTimers();
    setPlayMode('none');
    setCurrentTime(0);
  }

  function handleDividerMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    setIsDraggingDivider(true);
  }

  function handleContainerMouseMove(e: React.MouseEvent) {
    if (!isDraggingDivider || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setDividerPosition(Math.max(20, Math.min(80, pct)));
  }

  function handleContainerMouseUp() {
    setIsDraggingDivider(false);
  }

  useEffect(() => {
    return () => {
      stopAll();
      audioCtxRef.current?.close();
    };
  }, []);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header with settings info */}
      <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              A/B Compare
            </span>
          </div>
          <span className="text-[10px] text-neutral-500 tabular-nums">
            {formatTime(regionStart)} - {formatTime(regionEnd)} ({clipDuration.toFixed(1)}s)
          </span>
          <span className="text-[10px] text-cyan-400/80 bg-cyan-500/10 px-2 py-0.5 rounded-full font-medium">
            {candidateLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-neutral-500 hover:text-white transition-colors rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Settings summary bar */}
      {settingsSummary && (
        <div className="px-4 py-1.5 border-b border-white/[0.03] bg-white/[0.01]">
          <p className="text-[10px] text-neutral-500 truncate">
            <span className="text-neutral-400 font-medium">Settings:</span>{' '}
            {settingsSummary}
          </p>
        </div>
      )}

      {/* Split waveform panel */}
      <div
        ref={containerRef}
        className="relative flex h-[120px] select-none"
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleContainerMouseUp}
        onMouseLeave={handleContainerMouseUp}
      >
        {/* Original side */}
        <div
          className="relative overflow-hidden border-r border-white/[0.04]"
          style={{ width: `${dividerPosition}%` }}
        >
          <div className="absolute top-2 left-3 z-10">
            <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400/70 bg-amber-500/10 px-1.5 py-0.5 rounded">
              Original
            </span>
          </div>
          <canvas ref={originalCanvasRef} className="w-full h-full" style={{ display: 'block' }} />
        </div>

        {/* Divider handle */}
        <div
          className="absolute top-0 bottom-0 z-20 flex items-center cursor-col-resize"
          style={{ left: `${dividerPosition}%`, transform: 'translateX(-50%)' }}
          onMouseDown={handleDividerMouseDown}
        >
          <div className="w-[3px] h-10 rounded-full bg-neutral-400/60 hover:bg-cyan-400/80 transition-colors" />
        </div>

        {/* Processed side */}
        <div
          className="relative overflow-hidden"
          style={{ width: `${100 - dividerPosition}%` }}
        >
          <div className="absolute top-2 right-3 z-10">
            <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-400/70 bg-cyan-500/10 px-1.5 py-0.5 rounded">
              Processed
            </span>
          </div>
          <canvas ref={processedCanvasRef} className="w-full h-full" style={{ display: 'block' }} />
        </div>

        {/* Reprocessing overlay */}
        {isReprocessing && (
          <div className="absolute inset-0 z-30 bg-neutral-950/60 flex items-center justify-center backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs text-neutral-300">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              Reprocessing clip...
            </div>
          </div>
        )}
      </div>

      {/* Playback controls */}
      <div className="px-4 py-3 border-t border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PlayButton
            label="A"
            sublabel="Original"
            isActive={playMode === 'original'}
            onClick={playMode === 'original' ? stopAll : playOriginal}
            color="amber"
          />
          <PlayButton
            label="B"
            sublabel="Processed"
            isActive={playMode === 'processed'}
            onClick={playMode === 'processed' ? stopAll : playProcessed}
            color="cyan"
          />
          <button
            type="button"
            onClick={playMode === 'split' ? stopAll : playSplit}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${
              playMode === 'split'
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                : 'bg-white/[0.03] border-white/[0.06] text-neutral-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Headphones className="w-3 h-3" />
            {playMode === 'split' ? <Pause className="w-3 h-3" /> : null}
            Split L/R
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onApplyFullSong}
            disabled={isApplying || isReprocessing}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-black bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 rounded-lg transition-all shadow-lg shadow-cyan-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isApplying ? 'Applying...' : 'Apply to Full Song'}
          </button>
        </div>
      </div>

      {/* Hidden audio elements */}
      <audio
        ref={originalAudioRef}
        src={originalUrl}
        onEnded={handleEnded}
        crossOrigin="anonymous"
      />
      <audio
        ref={processedAudioRef}
        src={processedUrl}
        onEnded={handleEnded}
        crossOrigin="anonymous"
      />
    </div>
  );
}

function PlayButton({
  label,
  sublabel,
  isActive,
  onClick,
  color,
}: {
  label: string;
  sublabel: string;
  isActive: boolean;
  onClick: () => void;
  color: 'amber' | 'cyan';
}) {
  const activeClasses = color === 'amber'
    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
    : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${
        isActive
          ? activeClasses
          : 'bg-white/[0.03] border-white/[0.06] text-neutral-400 hover:text-white hover:bg-white/[0.06]'
      }`}
    >
      {isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      <span className="font-bold">{label}</span>
      <span className="text-[10px] opacity-60">{sublabel}</span>
    </button>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
