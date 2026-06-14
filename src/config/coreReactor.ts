/** Per-station bias for beat vs ambient reactor response */
export interface ReactorStationProfile {
  beatGain: number;
  rhythmBias: number;
}

export const REACTOR_STATION_PROFILES: Record<string, ReactorStationProfile> = {
  "groove-salad": { beatGain: 0.72, rhythmBias: 0.82 },
  "drone-zone": { beatGain: 0.18, rhythmBias: 0.12 },
  "deep-space": { beatGain: 0.18, rhythmBias: 0.12 },
  "rp-mellow": { beatGain: 0.48, rhythmBias: 0.55 },
};

export const DEFAULT_REACTOR_PROFILE: ReactorStationProfile = {
  beatGain: 0.7,
  rhythmBias: 0.5,
};

export const REACTOR_CALIBRATION_MS = 5000;

export function getReactorProfile(stationId: string): ReactorStationProfile {
  return REACTOR_STATION_PROFILES[stationId] ?? DEFAULT_REACTOR_PROFILE;
}
