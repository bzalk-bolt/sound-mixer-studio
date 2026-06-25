import { callEdgeFunction } from './api';
import type {
  MasteringRequest,
  MasteringJobResult,
  FinalizeJobResult,
  MasteringAdjustments,
  ProfilesResponse,
  ReprocessCandidateResponse,
  SourceAnalysis,
  VoiceGateOptions,
} from '../types/mastering';

export async function getProfiles(): Promise<ProfilesResponse> {
  const response = await callEdgeFunction('/mastering/profiles');
  return response.json();
}

export async function analyzeAudio(audioUrl: string): Promise<{ success: boolean; analysis: SourceAnalysis }> {
  const response = await callEdgeFunction('/mastering/analyze', {
    method: 'POST',
    body: { audio_url: audioUrl },
  });
  return response.json();
}

export async function startMastering(request: MasteringRequest): Promise<{ command_id: string }> {
  const response = await callEdgeFunction('/mastering/master', {
    method: 'POST',
    body: {
      audio_url: request.audio_url,
      reference_url: request.reference_url || undefined,
      profile: request.profile || undefined,
      planner: request.planner || 'auto',
      user_goal: request.user_goal || '',
      preview_seconds: request.preview_seconds || 75,
      output_filename: request.output_filename || 'FINAL_MASTER.wav',
      debug_stage_artifacts_enabled: request.debug_stage_artifacts_enabled ?? true,
      debug_waveform_points: request.debug_waveform_points || 512,
    },
  });
  return response.json();
}

export async function getJob(commandId: string): Promise<MasteringJobResult> {
  const response = await callEdgeFunction(`/jobs/${commandId}`);
  return response.json();
}

export async function savePreference(params: {
  commandId: string;
  winnerCandidateId: string;
  comparedCandidateIds: string[];
}): Promise<{ success: boolean }> {
  const response = await callEdgeFunction('/mastering/preference', {
    method: 'POST',
    body: {
      command_id: params.commandId,
      winner_candidate_id: params.winnerCandidateId,
      compared_candidate_ids: params.comparedCandidateIds,
      user_metadata: {},
    },
  });
  return response.json();
}

export async function finalizeMaster(params: {
  commandId: string;
  candidateId: string;
  outputFilename?: string;
}): Promise<{ command_id: string }> {
  const response = await callEdgeFunction('/mastering/finalize', {
    method: 'POST',
    body: {
      command_id: params.commandId,
      candidate_id: params.candidateId,
      output_filename: params.outputFilename || 'FINAL_MASTER.wav',
    },
  });
  return response.json();
}

export async function reprocessCandidate(params: {
  commandId: string;
  candidateId: string;
  adjustments: MasteringAdjustments;
  cleanAudio?: boolean;
  voiceGateOptions?: VoiceGateOptions;
  previewSeconds?: number;
  audioUrl?: string;
}): Promise<ReprocessCandidateResponse> {
  const body: Record<string, unknown> = {
    command_id: params.commandId,
    candidate_id: params.candidateId,
    adjustments: params.adjustments,
    clean_audio: params.cleanAudio || false,
    voice_gate_options: params.voiceGateOptions,
    preview_seconds: params.previewSeconds || 75,
  };
  if (params.audioUrl) {
    body.audio_url = params.audioUrl;
  }
  const response = await callEdgeFunction('/mastering/reprocess', {
    method: 'POST',
    body,
  });
  return response.json();
}

export async function pollJob(
  commandId: string,
  onUpdate?: (job: MasteringJobResult) => void
): Promise<MasteringJobResult> {
  while (true) {
    const job = await getJob(commandId);
    onUpdate?.(job);

    if (job.status === 'COMPLETED') return job;
    if (job.status === 'FAILED') {
      throw new Error(job.error_message || 'Job failed');
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

export async function pollFinalizeJob(
  commandId: string,
  onUpdate?: (job: FinalizeJobResult) => void
): Promise<FinalizeJobResult> {
  while (true) {
    const response = await callEdgeFunction(`/jobs/${commandId}`);
    const job: FinalizeJobResult = await response.json();
    onUpdate?.(job);

    if (job.status === 'COMPLETED') return job;
    if (job.status === 'FAILED') {
      throw new Error(job.error_message || 'Finalization failed');
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}
