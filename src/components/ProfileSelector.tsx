import { ProfilesResponse } from '../types/mastering';

interface ProfileSelectorProps {
  profiles: ProfilesResponse | null;
  selectedProfile: string;
  onSelect: (profile: string) => void;
}

const PROFILE_META: Record<string, { label: string; description: string }> = {
  modern_pop_streaming: { label: 'Pop / Streaming', description: 'Optimized for Spotify, Apple Music' },
  hiphop_loud: { label: 'Hip-Hop / Loud', description: 'Punchy lows, loud and competitive' },
  acoustic_natural: { label: 'Acoustic / Natural', description: 'Preserves dynamics, warm tone' },
  rock_punchy: { label: 'Rock / Punchy', description: 'Aggressive transients, driving energy' },
  edm_loud_clean: { label: 'EDM / Clean', description: 'Maximum loudness, minimal distortion' },
  country_radio: { label: 'Country / Radio', description: 'Radio-ready, clear vocals' },
  podcast_voice: { label: 'Podcast / Voice', description: 'Optimized for speech clarity' },
  warm_vintage: { label: 'Warm / Vintage', description: 'Analog warmth, soft high-end' },
  open_bright: { label: 'Open / Bright', description: 'Airy, detailed high frequencies' },
};

export function ProfileSelector({ profiles, selectedProfile, onSelect }: ProfileSelectorProps) {
  const profileIds = profiles ? Object.keys(profiles.profiles) : Object.keys(PROFILE_META);

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
        Mastering Profile
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <button
          onClick={() => onSelect('')}
          className={`text-left px-3 py-2.5 rounded-lg border transition-all duration-200 ${
            !selectedProfile
              ? 'border-cyan-500/40 bg-cyan-500/5'
              : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
          }`}
        >
          <div className="text-xs font-medium text-white">Auto-Detect</div>
          <div className="text-[10px] text-neutral-500">Let AI choose the best profile</div>
        </button>
        {profileIds.map((id) => {
          const meta = PROFILE_META[id] || { label: id, description: '' };
          const isSelected = selectedProfile === id;
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={`text-left px-3 py-2.5 rounded-lg border transition-all duration-200 ${
                isSelected
                  ? 'border-cyan-500/40 bg-cyan-500/5'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
              }`}
            >
              <div className="text-xs font-medium text-white">{meta.label}</div>
              <div className="text-[10px] text-neutral-500">{meta.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
