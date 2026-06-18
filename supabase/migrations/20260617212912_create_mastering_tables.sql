/*
# Create Sound Mixer Mastering Tables (Single-Tenant, No Auth)

1. New Tables
  - `mastering_jobs`
    - `id` (uuid, primary key)
    - `command_id` (text, unique) - API command ID returned from mastering API
    - `status` (text) - QUEUED, RUNNING, COMPLETED, FAILED
    - `audio_url` (text) - source audio URL
    - `reference_url` (text, nullable) - optional reference track URL
    - `profile` (text, nullable) - mastering profile used
    - `user_goal` (text, nullable) - user's mastering intent
    - `planner` (text) - auto, openai, or rule
    - `source_analysis` (jsonb, nullable) - analysis data from API
    - `recommended_candidates` (jsonb, nullable) - top candidate results
    - `error_message` (text, nullable) - error if job failed
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  - `mastering_preferences`
    - `id` (uuid, primary key)
    - `job_id` (uuid, FK to mastering_jobs)
    - `command_id` (text) - original mastering command_id
    - `winner_candidate_id` (text) - selected candidate
    - `compared_candidate_ids` (jsonb) - all compared candidates
    - `created_at` (timestamptz)

  - `finalized_masters`
    - `id` (uuid, primary key)
    - `job_id` (uuid, FK to mastering_jobs)
    - `final_command_id` (text, unique) - finalize job command_id
    - `candidate_id` (text) - which candidate was finalized
    - `output_filename` (text) - filename for final output
    - `status` (text) - QUEUED, RUNNING, COMPLETED, FAILED
    - `download_url` (text, nullable) - final download URL
    - `final_analysis` (jsonb, nullable) - final master analysis
    - `error_message` (text, nullable)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  - `uploaded_files`
    - `id` (uuid, primary key)
    - `filename` (text) - original filename
    - `file_url` (text) - public URL after upload
    - `file_type` (text) - source or reference
    - `mime_type` (text, nullable)
    - `file_size_bytes` (bigint, nullable)
    - `created_at` (timestamptz)

2. Security
  - Enable RLS on all tables.
  - Allow anon + authenticated full CRUD (single-tenant, no auth).

3. Indexes
  - mastering_jobs: index on command_id, status
  - finalized_masters: index on final_command_id
*/

-- mastering_jobs table
CREATE TABLE IF NOT EXISTS mastering_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'QUEUED',
  audio_url text NOT NULL,
  reference_url text,
  profile text,
  user_goal text,
  planner text NOT NULL DEFAULT 'auto',
  source_analysis jsonb,
  recommended_candidates jsonb,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE mastering_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_mastering_jobs" ON mastering_jobs;
CREATE POLICY "anon_select_mastering_jobs" ON mastering_jobs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_mastering_jobs" ON mastering_jobs;
CREATE POLICY "anon_insert_mastering_jobs" ON mastering_jobs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_mastering_jobs" ON mastering_jobs;
CREATE POLICY "anon_update_mastering_jobs" ON mastering_jobs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_mastering_jobs" ON mastering_jobs;
CREATE POLICY "anon_delete_mastering_jobs" ON mastering_jobs FOR DELETE
  TO anon, authenticated USING (true);

-- mastering_preferences table
CREATE TABLE IF NOT EXISTS mastering_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES mastering_jobs(id) ON DELETE CASCADE,
  command_id text NOT NULL,
  winner_candidate_id text NOT NULL,
  compared_candidate_ids jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mastering_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_mastering_preferences" ON mastering_preferences;
CREATE POLICY "anon_select_mastering_preferences" ON mastering_preferences FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_mastering_preferences" ON mastering_preferences;
CREATE POLICY "anon_insert_mastering_preferences" ON mastering_preferences FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_mastering_preferences" ON mastering_preferences;
CREATE POLICY "anon_update_mastering_preferences" ON mastering_preferences FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_mastering_preferences" ON mastering_preferences;
CREATE POLICY "anon_delete_mastering_preferences" ON mastering_preferences FOR DELETE
  TO anon, authenticated USING (true);

-- finalized_masters table
CREATE TABLE IF NOT EXISTS finalized_masters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES mastering_jobs(id) ON DELETE CASCADE,
  final_command_id text UNIQUE NOT NULL,
  candidate_id text NOT NULL,
  output_filename text NOT NULL DEFAULT 'FINAL_MASTER.wav',
  status text NOT NULL DEFAULT 'QUEUED',
  download_url text,
  final_analysis jsonb,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE finalized_masters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_finalized_masters" ON finalized_masters;
CREATE POLICY "anon_select_finalized_masters" ON finalized_masters FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_finalized_masters" ON finalized_masters;
CREATE POLICY "anon_insert_finalized_masters" ON finalized_masters FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_finalized_masters" ON finalized_masters;
CREATE POLICY "anon_update_finalized_masters" ON finalized_masters FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_finalized_masters" ON finalized_masters;
CREATE POLICY "anon_delete_finalized_masters" ON finalized_masters FOR DELETE
  TO anon, authenticated USING (true);

-- uploaded_files table
CREATE TABLE IF NOT EXISTS uploaded_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL DEFAULT 'source',
  mime_type text,
  file_size_bytes bigint,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_uploaded_files" ON uploaded_files;
CREATE POLICY "anon_select_uploaded_files" ON uploaded_files FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_uploaded_files" ON uploaded_files;
CREATE POLICY "anon_insert_uploaded_files" ON uploaded_files FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_uploaded_files" ON uploaded_files;
CREATE POLICY "anon_update_uploaded_files" ON uploaded_files FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_uploaded_files" ON uploaded_files;
CREATE POLICY "anon_delete_uploaded_files" ON uploaded_files FOR DELETE
  TO anon, authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mastering_jobs_status ON mastering_jobs(status);
CREATE INDEX IF NOT EXISTS idx_mastering_jobs_command_id ON mastering_jobs(command_id);
CREATE INDEX IF NOT EXISTS idx_finalized_masters_final_command_id ON finalized_masters(final_command_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_file_type ON uploaded_files(file_type);
