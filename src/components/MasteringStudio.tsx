import { useState, useEffect, useCallback, useRef } from 'react';
import { useMasteringState } from '../hooks/useMasteringState';
import { masteringService, jobService, uploadService, clipService } from '../services';
import { UploadZone } from './UploadZone';
import { ProfileSelector } from './ProfileSelector';
import { CandidateCard } from './CandidateCard';
import { CustomCandidateCard } from './CustomCandidateCard';
import { AnalysisPanel } from './AnalysisPanel';
import { ProgressIndicator } from './ProgressIndicator';
import { ConfirmModal } from './ConfirmModal';
import { ProcessingLogModal } from './ProcessingLogModal';
import { WaveformSelector } from './WaveformSelector';
import { ClipCompare } from './ClipCompare';
import type { MasteringAdjustments } from '../types/mastering';
import {
  Disc3,
  Download,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';

export function MasteringStudio() {
  const {
    state,
    setStatus,
    setSource,
    setReference,
    setMasterCommandId,
    setCandidates,
    selectCandidate,
    updateCandidate,
    setFinalizing,
    setFinalReady,
    setError,
    setProfiles,
    restoreSession,
    reset,
  } = useMasteringState();

  const [selectedProfile, setSelectedProfile] = useState('');
  const [userGoal, setUserGoal] = useState('');
  const [playingCandidate, setPlayingCandidate] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [progressLabel, setProgressLabel] = useState('Processing...');
  const [referenceFilename, setReferenceFilename] = useState('');
  const [logCandidateId, setLogCandidateId] = useState('');
  const [reprocessingCandidateId, setReprocessingCandidateId] = useState('');
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  // Clip workflow state
  const [isClipProcessing, setIsClipProcessing] = useState(false);
  const [isClipReprocessing, setIsClipReprocessing] = useState(false);
  const [clipPreviewUrl, setClipPreviewUrl] = useState('');
  const [clipRegion, setClipRegion] = useState<{ start: number; end: number } | null>(null);
  const [showClipCompare, setShowClipCompare] = useState(false);
  const [isApplyingFullSong, setIsApplyingFullSong] = useState(false);
  const lastClipAdjustmentsRef = useRef<MasteringAdjustments | null>(null);
  const clipUploadUrlRef = useRef<string>('');

  const selectedCandidate = state.recommendedCandidates.find(
    (candidate) => candidate.candidate_id === state.selectedCandidateId,
  );
  const logCandidate = state.recommendedCandidates.find(
    (candidate) => candidate.candidate_id === logCandidateId,
  ) || null;

  const originalWaveformUrl = state.selectedCandidateId
    ? state.originalCandidateUrls[state.selectedCandidateId] || selectedCandidate?.preview_file.storage_url || ''
    : '';

  useEffect(() => {
    masteringService.getProfiles()
      .then(setProfiles)
      .catch(() => {});
  }, [setProfiles]);

  useEffect(() => {
    async function tryRestore() {
      try {
        const params = new URLSearchParams(window.location.search);
        const jobParam = params.get('job');

        let job = null;
        if (jobParam) {
          job = await jobService.getJobByCommandId(jobParam);
        }
        if (!job) {
          job = await jobService.getLatestCompletedJob();
        }

        if (job && job.status === 'COMPLETED' && job.recommended_candidates) {
          restoreSession({
            sourceUrl: job.audio_url,
            sourceFilename: job.source_filename || '',
            referenceUrl: job.reference_url || '',
            masterCommandId: job.command_id,
            candidates: job.recommended_candidates,
            sourceAnalysis: job.source_analysis || null,
          });
          if (job.profile) setSelectedProfile(job.profile);
          if (job.user_goal) setUserGoal(job.user_goal);

          const url = new URL(window.location.href);
          url.searchParams.set('job', job.command_id);
          window.history.replaceState({}, '', url.toString());
        }
      } catch {
        // silent - just start fresh
      } finally {
        setIsRestoringSession(false);
      }
    }
    tryRestore();
  }, [restoreSession]);

  const handleSourceFile = useCallback(async (file: File) => {
    try {
      setProgressLabel('Uploading source mix...');
      setStatus('uploading_source');
      const upload = await uploadService.uploadAudioFile(file);
      setSource(upload.audioUrl, file.name);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [setStatus, setSource, setError]);

  const handleReferenceFile = useCallback(async (file: File) => {
    try {
      setProgressLabel('Uploading reference track...');
      setStatus('uploading_source');
      const upload = await uploadService.uploadAudioFile(file);
      setReference(upload.audioUrl);
      setReferenceFilename(file.name);
      setStatus(state.sourceUrl ? 'source_ready' : 'idle');
    } catch (err) {
      setError((err as Error).message);
    }
  }, [state.sourceUrl, setStatus, setReference, setError]);

  const handleStartMastering = useCallback(async () => {
    if (!state.sourceUrl) return;

    try {
      setMasterCommandId('pending');
      setProgressLabel('Starting mastering...');

      const { command_id } = await masteringService.startMastering({
        audio_url: state.sourceUrl,
        reference_url: state.referenceUrl || undefined,
        profile: selectedProfile || undefined,
        planner: 'auto',
        user_goal: userGoal || undefined,
        preview_seconds: 75,
        output_filename: state.sourceFilename
          ? state.sourceFilename.replace(/\.[^.]+$/, '_MASTER.wav')
          : 'FINAL_MASTER.wav',
      });

      setMasterCommandId(command_id);

      await jobService.createJob({
        commandId: command_id,
        audioUrl: state.sourceUrl,
        referenceUrl: state.referenceUrl || undefined,
        profile: selectedProfile || undefined,
        userGoal: userGoal || undefined,
        planner: 'auto',
        sourceFilename: state.sourceFilename || undefined,
      }).catch(() => {});

      const url = new URL(window.location.href);
      url.searchParams.set('job', command_id);
      window.history.replaceState({}, '', url.toString());

      const progressMessages = [
        'Analyzing audio...',
        'Computing spectral profile...',
        'Generating mastering plan...',
        'Rendering preview candidates...',
        'Scoring candidates...',
      ];
      let msgIdx = 0;
      const msgInterval = setInterval(() => {
        msgIdx = Math.min(msgIdx + 1, progressMessages.length - 1);
        setProgressLabel(progressMessages[msgIdx]);
      }, 5000);

      const result = await masteringService.pollJob(command_id);

      clearInterval(msgInterval);

      if (result.recommended_candidates && result.recommended_candidates.length > 0) {
        setCandidates(result.recommended_candidates, result.source_analysis || null, result.processing_log || []);
        await jobService.updateJobStatus(command_id, 'COMPLETED', {
          sourceAnalysis: result.source_analysis,
          recommendedCandidates: result.recommended_candidates,
        }).catch(() => {});
      } else {
        setError('No mastering candidates were generated.');
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [state.sourceUrl, state.referenceUrl, state.sourceFilename, selectedProfile, userGoal, setMasterCommandId, setCandidates, setError]);

  const handleFinalize = useCallback(async () => {
    if (!state.selectedCandidateId || !state.masterCommandId) return;

    try {
      setFinalizing('pending');
      setProgressLabel('Rendering final master...');

      const outputFilename = state.sourceFilename
        ? state.sourceFilename.replace(/\.[^.]+$/, '_MASTER.wav')
        : 'FINAL_MASTER.wav';

      await masteringService.savePreference({
        commandId: state.masterCommandId,
        winnerCandidateId: state.selectedCandidateId,
        comparedCandidateIds: state.recommendedCandidates.map((c) => c.candidate_id),
      });

      const { command_id: finalId } = await masteringService.finalizeMaster({
        commandId: state.masterCommandId,
        candidateId: state.selectedCandidateId,
        outputFilename,
      });

      setFinalizing(finalId);

      const finalResult = await masteringService.pollFinalizeJob(finalId);

      if (finalResult.final_outputs?.out_1?.storage_url) {
        setFinalReady(finalResult.final_outputs.out_1.storage_url);
      } else {
        setError('No final output URL returned.');
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, [state.selectedCandidateId, state.masterCommandId, state.sourceFilename, state.recommendedCandidates, setFinalizing, setFinalReady, setError]);

  const handleReset = useCallback(() => {
    setShowResetModal(false);
    reset();
    setSelectedProfile('');
    setUserGoal('');
    setPlayingCandidate('');
    setReferenceFilename('');
    setShowAnalysis(false);
    setLogCandidateId('');
    setReprocessingCandidateId('');
    setClipPreviewUrl('');
    setClipRegion(null);
    setShowClipCompare(false);
    setIsApplyingFullSong(false);
    lastClipAdjustmentsRef.current = null;

    const url = new URL(window.location.href);
    url.searchParams.delete('job');
    window.history.replaceState({}, '', url.toString());
  }, [reset]);

  const handleReprocessCandidate = useCallback(async (candidateId: string, adjustments: MasteringAdjustments) => {
    if (!state.masterCommandId) return;
    try {
      setReprocessingCandidateId(candidateId);
      const result = await masteringService.reprocessCandidate({
        commandId: state.masterCommandId,
        candidateId,
        adjustments,
        previewSeconds: 75,
      });
      updateCandidate(result.candidate, result.processing_log);
      await jobService.updateJobStatus(state.masterCommandId, 'COMPLETED', {
        recommendedCandidates: state.recommendedCandidates.map((candidate) =>
          candidate.candidate_id === result.candidate.candidate_id ? result.candidate : candidate,
        ),
      }).catch(() => {});
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setReprocessingCandidateId('');
    }
  }, [state.masterCommandId, state.recommendedCandidates, updateCandidate, setError]);

  const handleProcessClip = useCallback(async (clipFile: File, startSec: number, endSec: number) => {
    if (!state.masterCommandId || !state.selectedCandidateId || !selectedCandidate) return;

    try {
      setIsClipProcessing(true);
      setClipRegion({ start: startSec, end: endSec });

      const upload = await uploadService.uploadAudioFile(clipFile);
      clipUploadUrlRef.current = upload.audioUrl;

      const adjustments = selectedCandidate.control_settings || selectedCandidate.last_adjustments;
      const clipDuration = endSec - startSec;

      const result = await masteringService.reprocessCandidate({
        commandId: state.masterCommandId,
        candidateId: state.selectedCandidateId,
        adjustments: adjustments as MasteringAdjustments,
        previewSeconds: Math.ceil(clipDuration),
        audioUrl: upload.audioUrl,
      });

      lastClipAdjustmentsRef.current = adjustments as MasteringAdjustments;
      setClipPreviewUrl(result.candidate.preview_file.storage_url);
      setShowClipCompare(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsClipProcessing(false);
    }
  }, [state.masterCommandId, state.selectedCandidateId, selectedCandidate, setError]);

  const handleApplyFullSong = useCallback(async () => {
    if (!state.masterCommandId || !state.selectedCandidateId || !lastClipAdjustmentsRef.current) return;

    try {
      setIsApplyingFullSong(true);
      const result = await masteringService.reprocessCandidate({
        commandId: state.masterCommandId,
        candidateId: state.selectedCandidateId,
        adjustments: lastClipAdjustmentsRef.current,
        previewSeconds: 75,
      });
      updateCandidate(result.candidate, result.processing_log);
      await jobService.updateJobStatus(state.masterCommandId, 'COMPLETED', {
        recommendedCandidates: state.recommendedCandidates.map((candidate) =>
          candidate.candidate_id === result.candidate.candidate_id ? result.candidate : candidate,
        ),
      }).catch(() => {});

      setShowClipCompare(false);
      setClipPreviewUrl('');
      setClipRegion(null);
      lastClipAdjustmentsRef.current = null;
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsApplyingFullSong(false);
    }
  }, [state.masterCommandId, state.selectedCandidateId, state.recommendedCandidates, updateCandidate, setError]);

  const handleResetClip = useCallback(() => {
    setClipPreviewUrl('');
    setClipRegion(null);
    setShowClipCompare(false);
    lastClipAdjustmentsRef.current = null;
    clipUploadUrlRef.current = '';
  }, []);

  const handleReprocessClip = useCallback(async (adjustments: MasteringAdjustments) => {
    if (!state.masterCommandId || !state.selectedCandidateId || !clipRegion) return;

    try {
      setIsClipReprocessing(true);

      if (!clipUploadUrlRef.current) {
        const clipFile = await clipService.clipAudioFromUrl(originalWaveformUrl, clipRegion.start, clipRegion.end);
        const upload = await uploadService.uploadAudioFile(clipFile);
        clipUploadUrlRef.current = upload.audioUrl;
      }

      const clipDuration = clipRegion.end - clipRegion.start;

      const result = await masteringService.reprocessCandidate({
        commandId: state.masterCommandId,
        candidateId: state.selectedCandidateId,
        adjustments,
        previewSeconds: Math.ceil(clipDuration),
        audioUrl: clipUploadUrlRef.current,
      });

      lastClipAdjustmentsRef.current = adjustments;
      setClipPreviewUrl(result.candidate.preview_file.storage_url);
      setShowClipCompare(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsClipReprocessing(false);
    }
  }, [state.masterCommandId, state.selectedCandidateId, clipRegion, originalWaveformUrl, setError]);

  const handleSaveAsCandidate = useCallback((_name: string, _adjustments: MasteringAdjustments) => {
    // Future: save custom as a named 4th candidate
  }, []);

  const clipCandidateLabel = selectedCandidate
    ? `${selectedCandidate.style} / ${selectedCandidate.loudness}`
    : 'Custom';

  const clipSettingsSummary = (() => {
    const adj = selectedCandidate?.control_settings || selectedCandidate?.last_adjustments;
    if (!adj) return '';
    const parts: string[] = [];
    if (adj.brightness !== 0) parts.push(`Bright ${adj.brightness > 0 ? '+' : ''}${adj.brightness.toFixed(1)}`);
    if (adj.warmth !== 0) parts.push(`Warm ${adj.warmth > 0 ? '+' : ''}${adj.warmth.toFixed(1)}`);
    if (adj.bass !== 0) parts.push(`Bass ${adj.bass > 0 ? '+' : ''}${adj.bass.toFixed(1)}`);
    if (adj.presence !== 0) parts.push(`Pres ${adj.presence > 0 ? '+' : ''}${adj.presence.toFixed(1)}`);
    if (adj.loudness !== 0) parts.push(`Loud ${adj.loudness > 0 ? '+' : ''}${adj.loudness.toFixed(1)}`);
    if (adj.compression !== 0) parts.push(`Comp ${adj.compression > 0 ? '+' : ''}${adj.compression.toFixed(1)}`);
    if (adj.stereo_width !== 0) parts.push(`Width ${adj.stereo_width > 0 ? '+' : ''}${adj.stereo_width.toFixed(1)}`);
    if (adj.saturation !== 0) parts.push(`Sat ${adj.saturation > 0 ? '+' : ''}${adj.saturation.toFixed(1)}`);
    return parts.length > 0 ? parts.join(', ') : 'Default settings (no adjustments)';
  })();

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.04] bg-neutral-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
              <Disc3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">Sound Mixer</h1>
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest">AI Mastering Studio</p>
            </div>
          </div>
          {state.status !== 'idle' && (
            <button
              onClick={() => setShowResetModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-lg transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              New Session
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {isRestoringSession && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-neutral-400 text-sm">
              <Clock className="w-4 h-4 animate-pulse" />
              Restoring session...
            </div>
          </div>
        )}

        {!isRestoringSession && state.status === 'idle' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center max-w-lg mx-auto mb-12">
              <h2 className="text-2xl font-bold tracking-tight mb-2">Master your mix with AI</h2>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Upload your audio and let our AI analyze, process, and deliver studio-quality masters.
                Choose from multiple rendering styles tailored to your sound.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UploadZone
                label="Drop your mix here"
                onFileSelected={handleSourceFile}
                currentFile={null}
              />
              <UploadZone
                label="Reference track (optional)"
                onFileSelected={handleReferenceFile}
                currentFile={referenceFilename || null}
              />
            </div>
          </div>
        )}

        {state.status === 'uploading_source' && (
          <ProgressIndicator status="UPLOADING" label={progressLabel} />
        )}

        {state.status === 'source_ready' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UploadZone
                label="Source Mix"
                onFileSelected={handleSourceFile}
                currentFile={state.sourceFilename}
                onClear={() => {
                  reset();
                  setReferenceFilename('');
                }}
              />
              <UploadZone
                label="Reference track (optional)"
                onFileSelected={handleReferenceFile}
                currentFile={referenceFilename || (state.referenceUrl ? 'Reference loaded' : null)}
                onClear={() => {
                  setReference('');
                  setReferenceFilename('');
                }}
              />
            </div>

            <ProfileSelector
              profiles={state.profiles}
              selectedProfile={selectedProfile}
              onSelect={setSelectedProfile}
            />

            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Mastering Goal (optional)
              </label>
              <input
                type="text"
                value={userGoal}
                onChange={(e) => setUserGoal(e.target.value)}
                placeholder="e.g. Warm, loud master for streaming with clear vocals"
                className="w-full px-4 py-3 text-sm bg-white/[0.02] border border-white/[0.08] rounded-xl placeholder:text-neutral-600 focus:border-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all"
              />
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleStartMastering}
                className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-black font-semibold text-sm rounded-xl hover:from-cyan-400 hover:to-teal-400 transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
              >
                <Sparkles className="w-4 h-4" />
                Start Mastering
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {(state.status === 'starting_mastering' || state.status === 'mastering_running') && (
          <ProgressIndicator status="RUNNING" label={progressLabel} />
        )}

        {state.status === 'previews_ready' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight">Mastering Candidates</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {state.recommendedCandidates.length} candidates generated. Select your preferred master.
                </p>
              </div>
              {state.sourceAnalysis && (
                <button
                  onClick={() => setShowAnalysis(!showAnalysis)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-lg transition-colors"
                >
                  {showAnalysis ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  Analysis
                </button>
              )}
            </div>

            {/* Waveform Clip Selector */}
            {state.selectedCandidateId && originalWaveformUrl && (
              <WaveformSelector
                audioUrl={originalWaveformUrl}
                onProcessClip={handleProcessClip}
                onResetClip={handleResetClip}
                onSelectionChange={(region) => setClipRegion(region)}
                isProcessing={isClipProcessing}
                isLocked={showClipCompare}
              />
            )}

            {/* Clip A/B Compare */}
            {showClipCompare && clipPreviewUrl && clipRegion && originalWaveformUrl && (
              <ClipCompare
                originalUrl={originalWaveformUrl}
                processedUrl={clipPreviewUrl}
                regionStart={clipRegion.start}
                regionEnd={clipRegion.end}
                onClose={handleResetClip}
                onApplyFullSong={handleApplyFullSong}
                isApplying={isApplyingFullSong}
                isReprocessing={isClipReprocessing}
                candidateLabel={clipCandidateLabel}
                settingsSummary={clipSettingsSummary}
              />
            )}

            {/* Custom Remix Card - shows as soon as a region is selected */}
            {clipRegion && selectedCandidate && (
              <CustomCandidateCard
                baseCandidate={selectedCandidate}
                onReprocessClip={handleReprocessClip}
                onSaveAsCandidate={handleSaveAsCandidate}
                isReprocessing={isClipReprocessing}
                hasClipResult={!!clipPreviewUrl}
              />
            )}

            {showAnalysis && state.sourceAnalysis && (
              <div className="space-y-5 animate-in slide-in-from-top-2 duration-300">
                <AnalysisPanel
                  title="Source Analysis"
                  subtitle="Measured before mastering."
                  analysis={state.sourceAnalysis}
                />
                {selectedCandidate?.post_analysis && (
                  <AnalysisPanel
                    title={`Selected Candidate Analysis: ${selectedCandidate.style} / ${selectedCandidate.loudness}`}
                    subtitle="Measured after FFmpeg rendered the preview. Deltas compare against the source."
                    analysis={selectedCandidate.post_analysis}
                    compareTo={state.sourceAnalysis}
                  />
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.recommendedCandidates
                .sort((a, b) => b.score - a.score)
                .map((candidate, idx) => (
                  <CandidateCard
                    key={candidate.candidate_id}
                    candidate={candidate}
                    isSelected={state.selectedCandidateId === candidate.candidate_id}
                    isPlaying={playingCandidate === candidate.candidate_id}
                    onSelect={() => selectCandidate(candidate.candidate_id)}
                    onPlay={() => setPlayingCandidate(candidate.candidate_id)}
                    onShowLogs={() => setLogCandidateId(candidate.candidate_id)}
                    onReprocess={(adjustments) => handleReprocessCandidate(candidate.candidate_id, adjustments)}
                    isReprocessing={reprocessingCandidateId === candidate.candidate_id}
                    rank={idx + 1}
                  />
                ))}
            </div>

            {state.selectedCandidateId && (
              <div className="flex justify-end pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <button
                  onClick={handleFinalize}
                  className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-black font-semibold text-sm rounded-xl hover:from-cyan-400 hover:to-teal-400 transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
                >
                  <Sparkles className="w-4 h-4" />
                  Finalize Master
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            )}
          </div>
        )}

        {state.status === 'saving_preference' && (
          <ProgressIndicator status="SAVING" label="Saving your preference..." />
        )}

        {state.status === 'finalizing' && (
          <ProgressIndicator status="RENDERING" label={progressLabel} />
        )}

        {state.status === 'final_ready' && (
          <div className="flex flex-col items-center justify-center py-16 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
              <Download className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold tracking-tight mb-2">Master Ready</h2>
            <p className="text-sm text-neutral-400 mb-1">Your final master has been rendered successfully.</p>
            <div className="flex items-center gap-1.5 mb-8 text-xs text-amber-400/80">
              <Clock className="w-3 h-3" />
              <span>Download available for 2 hours</span>
            </div>
            <a
              href={state.finalDownloadUrl}
              download
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-semibold text-sm rounded-xl hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/20"
            >
              <Download className="w-4 h-4" />
              Download Master
            </a>
            <button
              onClick={() => setShowResetModal(true)}
              className="mt-4 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Start a new session
            </button>
          </div>
        )}

        {state.status === 'failed' && (
          <div className="flex flex-col items-center justify-center py-16 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
              <span className="text-2xl text-red-400">!</span>
            </div>
            <h2 className="text-lg font-bold tracking-tight mb-2">Something went wrong</h2>
            <p className="text-sm text-neutral-400 mb-6 max-w-md text-center">{state.errorMessage}</p>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-white/5 border border-white/[0.08] rounded-xl hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Try Again
            </button>
          </div>
        )}
      </main>

      <ConfirmModal
        isOpen={showResetModal}
        title="Start New Session"
        message="This will clear all current progress including any mastering results. Are you sure you want to start over?"
        confirmLabel="Start Over"
        cancelLabel="Keep Working"
        onConfirm={handleReset}
        onCancel={() => setShowResetModal(false)}
        variant="warning"
      />

      <ProcessingLogModal
        isOpen={Boolean(logCandidateId)}
        candidate={logCandidate}
        logs={state.processingLog}
        onClose={() => setLogCandidateId('')}
      />
    </div>
  );
}
