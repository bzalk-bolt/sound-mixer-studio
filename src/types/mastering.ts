export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export type AppStatus =
  | 'idle'
  | 'uploading_source'
  | 'source_ready'
  | 'starting_mastering'
  | 'mastering_running'
  | 'previews_ready'
  | 'saving_preference'
  | 'finalizing'
  | 'final_ready'
  | 'failed';

export interface LoudnessAnalysis {
  integrated_lufs: number;
  short_term_lufs_max: number | null;
  lra: number;
  true_peak_db: number;
  crest_factor: number;
}

export interface SpectrumAnalysis {
  sub_20_60: number;
  bass_60_120: number;
  low_mid_120_300: number;
  mid_300_1000: number;
  presence_1000_4000: number;
  harsh_4000_8000: number;
  air_8000_16000: number;
}

export interface StereoAnalysis {
  width_score: number;
  mono_correlation: number;
  low_end_width: number;
  channel_balance_db?: number;
  left_rms_db?: number;
  right_rms_db?: number;
  mid_rms_db?: number;
  side_rms_db?: number;
  effective_mono?: boolean;
  stereo_assessment?: string;
}

export interface DynamicsAnalysis {
  transient_density: number;
  compression_guess: string;
  clipping_detected: boolean;
}

export interface Classification {
  genre_guess: string;
  vocal_prominence: string;
  mix_quality: string;
  mastering_goal: string;
  mix_problem_tags: string[];
  already_mastered: boolean;
}

export interface SourceAnalysis {
  loudness: LoudnessAnalysis;
  spectrum: SpectrumAnalysis;
  stereo: StereoAnalysis;
  dynamics: DynamicsAnalysis;
  classification: Classification;
}

export interface ScoreBreakdown {
  score: number;
  spectral_distance_from_target: number;
  harshness_score: number;
  overcompression_risk: string;
}

export interface Candidate {
  candidate_id: string;
  style: string;
  loudness: string;
  score: number;
  preview_file: {
    storage_url: string;
  };
  plan: Record<string, unknown>;
  base_plan?: Record<string, unknown>;
  control_settings?: MasteringAdjustments;
  post_analysis: SourceAnalysis;
  score_breakdown: ScoreBreakdown;
  edit_version?: number;
  last_adjustments?: MasteringAdjustments;
}

export interface MasteringAdjustments {
  brightness: number;
  warmth: number;
  presence: number;
  bass: number;
  low_mid: number;
  air: number;
  stereo_width: number;
  cleanup: number;
  cleanup_gate: number;
  cleanup_noise: number;
  loudness: number;
  volume_db: number;
  input_gain_db: number;
  compression: number;
  compression_threshold: number;
  compression_attack: number;
  compression_release: number;
  compression_mix: number;
  saturation: number;
  limiter: number;
  ambience: number;
}

export interface ProcessingLogEntry {
  ts: string;
  event: string;
  [key: string]: unknown;
}

export interface MasteringJobResult {
  command_id: string;
  status: JobStatus;
  source_analysis?: SourceAnalysis;
  reference_analysis?: SourceAnalysis | null;
  target_profile?: Record<string, unknown>;
  planner_result?: {
    provider: string;
    model: string;
    status: string;
  };
  candidate_scores?: Candidate[];
  recommended_candidates?: Candidate[];
  processing_log?: ProcessingLogEntry[];
  output_filename?: string;
  error_message?: string;
  created_at?: number;
}

export interface FinalizeJobResult {
  command_id: string;
  status: JobStatus;
  source_command_id?: string;
  selected_candidate?: string;
  final_outputs?: {
    out_1: {
      storage_url: string;
    };
  };
  final_analysis?: Record<string, unknown>;
  processing_log?: ProcessingLogEntry[];
  error_message?: string;
}

export interface MasteringProfile {
  profile: string;
  target_lufs: number;
  target_true_peak: number;
  target_lra: number;
}

export interface ProfilesResponse {
  profiles: Record<string, MasteringProfile>;
  candidate_grid: {
    styles: string[];
    loudness_levels: string[];
  };
  ai_planner: {
    provider: string;
    openai_configured: boolean;
    openai_model: string;
  };
}

export interface MasteringRequest {
  audio_url: string;
  reference_url?: string;
  profile?: string;
  planner?: 'auto' | 'openai' | 'rule';
  user_goal?: string;
  preview_seconds?: number;
  output_filename?: string;
}

export interface ReprocessCandidateResponse {
  success: boolean;
  candidate: Candidate;
  processing_log?: ProcessingLogEntry[];
}

export interface AppState {
  sourceUrl: string;
  sourceFilename: string;
  referenceUrl: string;
  masterCommandId: string;
  finalCommandId: string;
  status: AppStatus;
  recommendedCandidates: Candidate[];
  processingLog: ProcessingLogEntry[];
  selectedCandidateId: string;
  finalDownloadUrl: string;
  errorMessage: string;
  sourceAnalysis: SourceAnalysis | null;
  profiles: ProfilesResponse | null;
  originalCandidateUrls: Record<string, string>;
}
