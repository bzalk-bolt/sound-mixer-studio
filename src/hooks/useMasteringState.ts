import { useState, useCallback } from 'react';
import type { AppState, AppStatus, Candidate, ProfilesResponse, SourceAnalysis } from '../types/mastering';

const initialState: AppState = {
  sourceUrl: '',
  sourceFilename: '',
  referenceUrl: '',
  masterCommandId: '',
  finalCommandId: '',
  status: 'idle',
  recommendedCandidates: [],
  selectedCandidateId: '',
  finalDownloadUrl: '',
  errorMessage: '',
  sourceAnalysis: null,
  profiles: null,
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

  const setCandidates = useCallback((candidates: Candidate[], analysis: SourceAnalysis | null) => {
    setState((prev) => ({
      ...prev,
      recommendedCandidates: candidates,
      sourceAnalysis: analysis,
      status: 'previews_ready',
    }));
  }, []);

  const selectCandidate = useCallback((id: string) => {
    setState((prev) => ({ ...prev, selectedCandidateId: id }));
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
    selectCandidate,
    setFinalizing,
    setFinalReady,
    setError,
    setProfiles,
    reset,
  };
}
