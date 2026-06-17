import { supabase } from './api';
import type { Candidate, SourceAnalysis } from '../types/mastering';

export async function createJob(params: {
  commandId: string;
  audioUrl: string;
  referenceUrl?: string;
  profile?: string;
  userGoal?: string;
  planner: string;
}) {
  const { error } = await supabase.from('mastering_jobs').insert({
    command_id: params.commandId,
    audio_url: params.audioUrl,
    reference_url: params.referenceUrl || null,
    profile: params.profile || null,
    user_goal: params.userGoal || null,
    planner: params.planner,
    status: 'QUEUED',
  });
  if (error) throw error;
}

export async function updateJobStatus(commandId: string, status: string, data?: {
  sourceAnalysis?: SourceAnalysis;
  recommendedCandidates?: Candidate[];
  errorMessage?: string;
}) {
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (data?.sourceAnalysis) update.source_analysis = data.sourceAnalysis;
  if (data?.recommendedCandidates) update.recommended_candidates = data.recommendedCandidates;
  if (data?.errorMessage) update.error_message = data.errorMessage;

  const { error } = await supabase
    .from('mastering_jobs')
    .update(update)
    .eq('command_id', commandId);
  if (error) throw error;
}

export async function savePreferenceRecord(params: {
  jobId: string;
  commandId: string;
  winnerCandidateId: string;
  comparedCandidateIds: string[];
}) {
  const { error } = await supabase.from('mastering_preferences').insert({
    job_id: params.jobId,
    command_id: params.commandId,
    winner_candidate_id: params.winnerCandidateId,
    compared_candidate_ids: params.comparedCandidateIds,
  });
  if (error) throw error;
}

export async function createFinalizeRecord(params: {
  jobId: string;
  finalCommandId: string;
  candidateId: string;
  outputFilename: string;
}) {
  const { error } = await supabase.from('finalized_masters').insert({
    job_id: params.jobId,
    final_command_id: params.finalCommandId,
    candidate_id: params.candidateId,
    output_filename: params.outputFilename,
    status: 'QUEUED',
  });
  if (error) throw error;
}

export async function updateFinalizeStatus(finalCommandId: string, status: string, data?: {
  downloadUrl?: string;
  finalAnalysis?: Record<string, unknown>;
  errorMessage?: string;
}) {
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (data?.downloadUrl) update.download_url = data.downloadUrl;
  if (data?.finalAnalysis) update.final_analysis = data.finalAnalysis;
  if (data?.errorMessage) update.error_message = data.errorMessage;

  const { error } = await supabase
    .from('finalized_masters')
    .update(update)
    .eq('final_command_id', finalCommandId);
  if (error) throw error;
}

export async function getJobByCommandId(commandId: string) {
  const { data, error } = await supabase
    .from('mastering_jobs')
    .select('*')
    .eq('command_id', commandId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getRecentJobs(limit = 10) {
  const { data, error } = await supabase
    .from('mastering_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}
