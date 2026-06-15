"use client";

import { useRadioPlayer } from "@/hooks/useRadioPlayer";

export function AmbientAudioModule() {
  const {
    station,
    stations,
    isPlaying,
    track,
    trackCoverUrl,
    play,
    pause,
    setStation,
  } = useRadioPlayer();

  return (
    <div className="ambient-audio footer-audio-unit">
      <div className="ambient-audio-header">
        <div className="label">Ambient Audio</div>
        <button
          type="button"
          onClick={isPlaying ? pause : play}
          className="ambient-audio-play"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>
      </div>

      <div className="ambient-audio-station">{station.name}</div>

      <div className="ambient-audio-status">
        <span className={`ambient-audio-dot${isPlaying ? " is-live" : ""}`} />
        <span>{isPlaying ? "LIVE" : "STANDBY"}</span>
      </div>

      {track && (
        <div
          className={`ambient-audio-now-playing${trackCoverUrl ? " has-cover" : ""}`}
        >
          {trackCoverUrl && (
            <img
              className="ambient-audio-cover"
              src={trackCoverUrl}
              alt=""
              width={40}
              height={40}
              loading="lazy"
              decoding="async"
            />
          )}
          <div className="ambient-audio-track" title={track}>
            {track}
          </div>
        </div>
      )}

      <select
        className="ambient-audio-select"
        value={station.id}
        onChange={(e) => {
          const next = stations.find((s) => s.id === e.target.value);
          if (next) setStation(next);
        }}
        aria-label="Select radio station"
      >
        {stations.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
