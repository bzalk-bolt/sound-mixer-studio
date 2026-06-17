const MASTERING_API_BASE =
  import.meta.env.VITE_MASTERING_API_BASE || 'https://sound-mixer-api.jamrockdev.com';

export interface UploadedAudio {
  audioUrl: string;
  uploadId: string;
  filename: string;
  bytes: number;
  expiresInSeconds: number;
}

function safeHeaderFilename(filename: string): string {
  return filename
    .replace(/[/\\]/g, '-')
    .replace(/[^\w.-]/g, '_')
    .slice(0, 180) || 'upload.wav';
}

export async function uploadAudioFile(file: File): Promise<UploadedAudio> {
  const response = await fetch(`${MASTERING_API_BASE}/mastering/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'X-Filename': safeHeaderFilename(file.name),
    },
    body: file,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return {
    audioUrl: data.audio_url,
    uploadId: data.upload_id,
    filename: data.filename,
    bytes: data.bytes,
    expiresInSeconds: data.expires_in_seconds,
  };
}
