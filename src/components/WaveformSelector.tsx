import { useRef, useEffect, useState, useCallback } from 'react';
import { clipService } from '../services';
import { Scissors, RotateCcw, Loader2, Play, Square } from 'lucide-react';

interface WaveformSelectorProps {
  audioUrl: string;
  onProcessClip: (clipFile: File, startSec: number, endSec: number) => void;
  onResetClip: () => void;
  onSelectionChange?: (region: { start: number; end: number } | null) => void;
  isProcessing: boolean;
  isLocked: boolean;
}

export function WaveformSelector({
  audioUrl,
  onProcessClip,
  onResetClip,
  onSelectionChange,
  isProcessing,
  isLocked,
}: WaveformSelectorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [duration, setDuration] = useState(0);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [resizeEdge, setResizeEdge] = useState<'left' | 'right' | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimerRef = useRef<number | null>(null);

  const PEAK_COUNT = 800;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setPeaks(null);
    setSelection(null);

    clipService.decodeAudioPeaks(audioUrl, PEAK_COUNT).then((result) => {
      if (cancelled) return;
      setPeaks(result.peaks);
      setDuration(result.duration);
      setIsLoading(false);
    }).catch(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, [audioUrl]);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
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

    // Draw selection background
    if (selection && duration > 0) {
      const selStartX = (selection.start / duration) * width;
      const selEndX = (selection.end / duration) * width;
      ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
      ctx.fillRect(selStartX, 0, selEndX - selStartX, height);

      // Selection borders
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(selStartX, 0);
      ctx.lineTo(selStartX, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(selEndX, 0);
      ctx.lineTo(selEndX, height);
      ctx.stroke();

      // Edge handles
      ctx.fillStyle = 'rgba(6, 182, 212, 0.9)';
      const handleH = 24;
      const handleW = 4;
      const handleY = midY - handleH / 2;
      ctx.beginPath();
      ctx.roundRect(selStartX - handleW / 2, handleY, handleW, handleH, 2);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(selEndX - handleW / 2, handleY, handleW, handleH, 2);
      ctx.fill();
    }

    // Draw waveform bars
    for (let i = 0; i < peaks.length; i++) {
      const x = i * barWidth;
      const peakHeight = peaks[i] * (height * 0.8);
      const barH = Math.max(1, peakHeight);

      let inSelection = false;
      if (selection && duration > 0) {
        const timeFraction = i / peaks.length;
        const time = timeFraction * duration;
        inSelection = time >= selection.start && time <= selection.end;
      }

      ctx.fillStyle = inSelection
        ? 'rgba(6, 182, 212, 0.7)'
        : 'rgba(163, 163, 163, 0.3)';

      ctx.fillRect(x, midY - barH / 2, Math.max(1, barWidth - 0.5), barH);
    }

    // Time markers
    if (duration > 0) {
      ctx.fillStyle = 'rgba(115, 115, 115, 0.6)';
      ctx.font = '9px ui-monospace, monospace';
      ctx.textAlign = 'center';
      const interval = duration > 120 ? 30 : duration > 60 ? 15 : duration > 30 ? 10 : 5;
      for (let t = interval; t < duration; t += interval) {
        const x = (t / duration) * width;
        ctx.fillText(formatTime(t), x, height - 3);
        ctx.fillStyle = 'rgba(115, 115, 115, 0.2)';
        ctx.fillRect(x, 0, 0.5, height - 14);
        ctx.fillStyle = 'rgba(115, 115, 115, 0.6)';
      }
    }
  }, [peaks, selection, duration]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  useEffect(() => {
    const handleResize = () => drawWaveform();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawWaveform]);

  useEffect(() => {
    onSelectionChange?.(selection);
  }, [selection, onSelectionChange]);

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
      }
    };
  }, []);

  function xToTime(clientX: number): number {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return 0;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  }

  function isNearEdge(clientX: number): 'left' | 'right' | null {
    if (!selection || !canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const leftX = rect.left + (selection.start / duration) * rect.width;
    const rightX = rect.left + (selection.end / duration) * rect.width;
    const threshold = 8;
    if (Math.abs(clientX - leftX) < threshold) return 'left';
    if (Math.abs(clientX - rightX) < threshold) return 'right';
    return null;
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (isLocked || isProcessing || !peaks) return;
    e.preventDefault();

    const edge = isNearEdge(e.clientX);
    if (edge) {
      setResizeEdge(edge);
      setIsDragging(true);
      return;
    }

    const time = xToTime(e.clientX);
    setDragStart(time);
    setIsDragging(true);
    setResizeEdge(null);
    setSelection(null);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging || !peaks) return;

    const time = xToTime(e.clientX);

    if (resizeEdge && selection) {
      if (resizeEdge === 'left') {
        setSelection({ start: Math.min(time, selection.end - 0.5), end: selection.end });
      } else {
        setSelection({ start: selection.start, end: Math.max(time, selection.start + 0.5) });
      }
      return;
    }

    const start = Math.min(dragStart, time);
    const end = Math.max(dragStart, time);
    if (end - start > 0.3) {
      setSelection({ start, end });
    }
  }

  function handleMouseUp() {
    setIsDragging(false);
    setResizeEdge(null);
  }

  function handlePreviewPlay() {
    if (!selection || !audioUrl) return;

    if (isPreviewPlaying) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
      setIsPreviewPlaying(false);
      return;
    }

    const audio = new Audio(audioUrl);
    audio.currentTime = selection.start;
    previewAudioRef.current = audio;

    const playDuration = (selection.end - selection.start) * 1000;
    previewTimerRef.current = window.setTimeout(() => {
      audio.pause();
      previewAudioRef.current = null;
      setIsPreviewPlaying(false);
    }, playDuration);

    audio.addEventListener('ended', () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      setIsPreviewPlaying(false);
      previewAudioRef.current = null;
    });

    audio.play().catch(() => setIsPreviewPlaying(false));
    setIsPreviewPlaying(true);
  }

  async function handleProcessClip() {
    if (!selection || isProcessing) return;
    const clipFile = await clipService.clipAudioFromUrl(audioUrl, selection.start, selection.end);
    onProcessClip(clipFile, selection.start, selection.end);
  }

  function handleReset() {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    setIsPreviewPlaying(false);
    setSelection(null);
    onResetClip();
  }

  function getCursorStyle(): string {
    if (isLocked || isProcessing) return 'cursor-default';
    return 'cursor-crosshair';
  }

  const selectionDuration = selection ? selection.end - selection.start : 0;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
            Clip Selector
          </span>
        </div>
        {selection && (
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-neutral-400 tabular-nums">
              {formatTime(selection.start)} - {formatTime(selection.end)}
              <span className="ml-2 text-cyan-400 font-medium">
                ({selectionDuration.toFixed(1)}s)
              </span>
            </span>
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        className={`relative px-4 py-4 ${getCursorStyle()}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {isLoading ? (
          <div className="h-[100px] flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-neutral-500 animate-spin" />
            <span className="ml-2 text-xs text-neutral-500">Decoding waveform...</span>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="w-full h-[100px] select-none"
            style={{ display: 'block' }}
          />
        )}

        {isLocked && (
          <div className="absolute inset-0 bg-neutral-950/40 flex items-center justify-center">
            <span className="text-xs text-neutral-400">Reset to select a new region</span>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-white/[0.04] flex items-center justify-between">
        <p className="text-[10px] text-neutral-600">
          {isLocked ? 'Clip processed. Reset to try a different section.' : 'Click and drag to select a region of the waveform.'}
        </p>
        <div className="flex items-center gap-2">
          {selection && (
            <button
              type="button"
              onClick={handlePreviewPlay}
              disabled={isProcessing || isLocked}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${
                isPreviewPlaying
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                  : 'text-neutral-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.06]'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {isPreviewPlaying ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isPreviewPlaying ? 'Stop' : 'Preview'}
            </button>
          )}
          {(isLocked || selection) && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-lg transition-colors disabled:opacity-40"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
          {selection && !isLocked && (
            <button
              type="button"
              onClick={handleProcessClip}
              disabled={isProcessing || selectionDuration < 1}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-black bg-cyan-500 hover:bg-cyan-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Scissors className="w-3 h-3" />
                  Process Clip
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
