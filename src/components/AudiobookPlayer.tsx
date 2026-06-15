"use client";

import { useCallback, useEffect, useState } from "react";
import { AudiobookLibrary } from "@/components/AudiobookLibrary";
import { ServiceUnavailablePanel } from "@/components/ui/ServiceUnavailablePanel";
import { useAudiobooks } from "@/context/AudiobooksContext";
import { formatAudiobookDuration } from "@/lib/audiobooksPlayer";
import { useAdaptivePoll } from "@/hooks/useAdaptivePoll";
import { useIntervalFetch } from "@/hooks/useIntervalFetch";
import { getModuleConfig } from "@/lib/moduleRegistry";
import { fetchAudiobooks } from "@/services/audiobooksService";

export function AudiobookPlayer() {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const config = getModuleConfig("audiobooks");
  const dayInterval = config?.refreshInterval ?? 30 * 60 * 1000;
  const poll = useAdaptivePoll("audiobooks", dayInterval);

  const fetcher = useCallback(() => fetchAudiobooks(), []);
  const { data, loading, unavailableService } = useIntervalFetch({
    fetcher,
    interval: poll.intervalMs,
    paused: poll.paused,
    cacheKey: "jarvis-cache-v2-audiobooks",
  });

  const {
    current,
    pendingResume,
    isPlaying,
    positionSec,
    durationSec,
    togglePlay,
    next,
    prev,
    seek,
    resumeLast,
    getNowPlayingTitle,
    setPlaylist,
  } = useAudiobooks();

  useEffect(() => {
    if (data?.items.length) {
      setPlaylist(data.items);
    }
  }, [data, setPlaylist]);

  const title = getNowPlayingTitle();
  const showResume = !current && pendingResume && !unavailableService;
  const coverUrl =
    current?.thumbnailUrl ??
    (showResume ? pendingResume?.thumbnailUrl : undefined);

  if (unavailableService) {
    return (
      <div className="audiobook-player footer-audio-unit">
        <ServiceUnavailablePanel service={unavailableService} />
      </div>
    );
  }

  return (
    <>
      <div className="audiobook-player footer-audio-unit">
        <div className="audiobook-player-header">
          <div className="label">Audiobooks</div>
          <div className="audiobook-player-controls">
            <button
              type="button"
              className="audiobook-player-btn"
              onClick={prev}
              disabled={!current}
              aria-label="Предыдущая"
            >
              ⏮
            </button>
            <button
              type="button"
              className="audiobook-player-btn audiobook-player-btn--play"
              onClick={togglePlay}
              aria-label={isPlaying ? "Пауза" : "Воспроизведение"}
            >
              {isPlaying ? "❚❚" : "▶"}
            </button>
            <button
              type="button"
              className="audiobook-player-btn"
              onClick={next}
              disabled={!current}
              aria-label="Следующая"
            >
              ⏭
            </button>
          </div>
        </div>

        <div
          className={`audiobook-player-now-playing${coverUrl ? " has-cover" : ""}`}
        >
          {coverUrl && (
            <img
              className="audiobook-player-cover"
              src={coverUrl}
              alt=""
              width={40}
              height={40}
              loading="lazy"
              decoding="async"
            />
          )}
          {current || title ? (
            <div className="audiobook-player-title" title={title}>
              {title || "—"}
            </div>
          ) : showResume ? (
            <button
              type="button"
              className="audiobook-player-title audiobook-player-resume"
              onClick={resumeLast}
            >
              продолжить: {pendingResume!.title}
            </button>
          ) : (
            <div className="audiobook-player-title audiobook-player-invite">
              Выберите книгу
            </div>
          )}
        </div>

        <div className="audiobook-player-status">
          <span
            className={`audiobook-player-dot${isPlaying ? " is-live" : ""}`}
            aria-hidden
          />
          <span>{isPlaying ? "PLAYING" : current ? "PAUSED" : "STANDBY"}</span>
          {durationSec > 0 && (
            <span className="audiobook-player-time">
              {formatAudiobookDuration(positionSec)} /{" "}
              {formatAudiobookDuration(durationSec)}
            </span>
          )}
        </div>

        {durationSec > 0 && (
          <input
            type="range"
            className="audiobook-player-progress"
            min={0}
            max={durationSec}
            step={1}
            value={Math.min(positionSec, durationSec)}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Позиция воспроизведения"
          />
        )}

        <button
          type="button"
          className="audiobook-player-library-btn"
          onClick={() => setLibraryOpen(true)}
        >
          Библиотека
        </button>
      </div>

      <AudiobookLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        data={data}
        loading={loading}
      />
    </>
  );
}
