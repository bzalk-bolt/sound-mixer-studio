import { useState, useCallback } from 'react';
import type { AppState, AppStatus, Candidate, DebugArtifacts, ProcessingLogEntry, ProfilesResponse, SourceAnalysis } from '../types/mastering';

const initialState: AppState = {
  sourceUrl: '',
  sourceFilename: '',
  referenceUrl: '',
  masterCommandId: '',
  finalCommandId: '',
  status: 'idle',
  recommendedCandidates: [],
  processingLog: [],
  selectedCandidateId: '',
  finalDownloadUrl: '',
  errorMessage: '',
  sourceAnalysis: null,
  debugArtifacts: null,
  profiles: null,
  originalCandidateUrls: {},
};

export function useMasteringState() {
  const [state, setState] = useState<AppState>(initialState);

  const setStatus = useCallback((status: AppStatus) => {
    setState((prev) => ({ ...prev, status }));
  }, []);

  const setSource = useCallback((url: string, filename: string) => {
    setState((prev) => ({ ...prev, sourceUrl: url, sourceFilename: filename, status: 'source_ready' }));
  }, []);

  const setReference = useCallback((url: string) => {
    setState((prev) => ({ ...prev, referenceUrl: url }));
  }, []);

  const setMasterCommandId = useCallback((id: string) => {
    setState((prev) => ({ ...prev, masterCommandId: id, status: 'mastering_running' }));
  }, []);

  const setCandidates = useCallback((candidates: Candidate[], analysis: SourceAnalysis | null, processingLog: ProcessingLogEntry[] = []) => {
    const originalUrls: Record<string, string> = {};
    for (const c of candidates) {
      originalUrls[c.candidate_id] = c.preview_file.storage_url;
    }
    setState((prev) => ({
      ...prev,
      recommendedCandidates: candidates,
      processingLog,
      sourceAnalysis: analysis,
      status: 'previews_ready',
      originalCandidateUrls: { ...prev.originalCandidateUrls, ...originalUrls },
    }));
  }, []);

  const setDebugArtifacts = useCallback((debugArtifacts: DebugArtifacts | null) => {
    setState((prev) => ({ ...prev, debugArtifacts }));
  }, []);

  const selectCandidate = useCallback((id: string) => {
    setState((prev) => ({ ...prev, selectedCandidateId: id }));
  }, []);

  const updateCandidate = useCallback((candidate: Candidate, processingLog?: ProcessingLogEntry[]) => {
    setState((prev) => ({
      ...prev,
      recommendedCandidates: prev.recommendedCandidates.map((item) =>
        item.candidate_id === candidate.candidate_id ? candidate : item,
      ),
      processingLog: processingLog || prev.processingLog,
    }));
  }, []);

  const setFinalizing = useCallback((commandId: string) => {
    setState((prev) => ({ ...prev, finalCommandId: commandId, status: 'finalizing' }));
  }, []);

  const setFinalReady = useCallback((downloadUrl: string) => {
    setState((prev) => ({ ...prev, finalDownloadUrl: downloadUrl, status: 'final_ready' }));
  }, []);

  const setError = useCallback((message: string) => {
    setState((prev) => ({ ...prev, errorMessage: message, status: 'failed' }));
  }, []);

  const setProfiles = useCallback((profiles: ProfilesResponse) => {
    setState((prev) => ({ ...prev, profiles }));
  }, []);

  const restoreSession = useCallback((params: {
    sourceUrl: string;
    sourceFilename: string;
    referenceUrl: string;
    masterCommandId: string;
    candidates: Candidate[];
    sourceAnalysis: SourceAnalysis | null;
    debugArtifacts?: DebugArtifacts | null;
    selectedCandidateId?: string;
  }) => {
    const originalUrls: Record<string, string> = {};
    for (const c of params.candidates) {
      originalUrls[c.candidate_id] = c.preview_file.storage_url;
    }
    setState({
      ...initialState,
      sourceUrl: params.sourceUrl,
      sourceFilename: params.sourceFilename,
      referenceUrl: params.referenceUrl,
      masterCommandId: params.masterCommandId,
      recommendedCandidates: params.candidates,
      sourceAnalysis: params.sourceAnalysis,
      debugArtifacts: params.debugArtifacts || null,
      selectedCandidateId: params.selectedCandidateId || '',
      status: 'previews_ready',
      originalCandidateUrls: originalUrls,
    });
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    setStatus,
    setSource,
    setReference,
    setMasterCommandId,
    setCandidates,
    setDebugArtifacts,
    selectCandidate,
    updateCandidate,
    setFinalizing,
    setFinalReady,
    setError,
    setProfiles,
    restoreSession,
    reset,
  };
}
