"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  loadYouTubeIframeApi,
  PROGRESS_SAVE_INTERVAL_MS,
  readAudiobookProgress,
  writeAudiobookProgress,
  type StoredAudiobookProgress,
} from "@/lib/audiobooksPlayer";
import type { AudiobookItem } from "@/types/modules";

const PLAYER_ELEMENT_ID = "jarvis-youtube-player-host";

/** Survives React Strict Mode / Fast Refresh — YT mutates the host DOM. */
let sharedPlayer: YT.Player | null = null;
let sharedHost: HTMLDivElement | null = null;

function ensurePlayerHost(): HTMLDivElement {
  if (sharedHost?.isConnected) return sharedHost;

  const existing = document.getElementById(PLAYER_ELEMENT_ID);
  if (existing instanceof HTMLDivElement) {
    sharedHost = existing;
    return existing;
  }

  const host = document.createElement("div");
  host.id = PLAYER_ELEMENT_ID;
  host.className = "audiobook-yt-host";
  host.setAttribute("aria-hidden", "true");
  document.body.appendChild(host);
  sharedHost = host;
  return host;
}

interface AudiobooksContextValue {
  current: AudiobookItem | null;
  isPlaying: boolean;
  positionSec: number;
  durationSec: number;
  playerReady: boolean;
  pendingResume: StoredAudiobookProgress | null;
  playlist: AudiobookItem[];
  setPlaylist: (items: AudiobookItem[]) => void;
  play: (item: AudiobookItem) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (sec: number) => void;
  resumeLast: () => void;
  getNowPlayingTitle: () => string;
}

const AudiobooksContext = createContext<AudiobooksContextValue | null>(null);

function itemToProgress(
  item: AudiobookItem,
  positionSec: number
): StoredAudiobookProgress {
  return {
    videoId: item.videoId,
    positionSec,
    title: item.title,
    thumbnailUrl: item.thumbnailUrl,
    publishedAt: item.publishedAt,
    durationSec: item.durationSec,
  };
}

function storedToItem(stored: StoredAudiobookProgress): AudiobookItem {
  return {
    videoId: stored.videoId,
    title: stored.title,
    thumbnailUrl: stored.thumbnailUrl,
    publishedAt: stored.publishedAt,
    durationSec: stored.durationSec,
  };
}

export function AudiobooksProvider({ children }: { children: ReactNode }) {
  const playerRef = useRef<YT.Player | null>(null);
  const currentRef = useRef<AudiobookItem | null>(null);
  const playlistRef = useRef<AudiobookItem[]>([]);

  const [playerReady, setPlayerReady] = useState(false);
  const [current, setCurrent] = useState<AudiobookItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionSec, setPositionSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [playlist, setPlaylistState] = useState<AudiobookItem[]>([]);
  const [pendingResume, setPendingResume] = useState<StoredAudiobookProgress | null>(
    () => (typeof window !== "undefined" ? readAudiobookProgress() : null)
  );

  currentRef.current = current;
  playlistRef.current = playlist;

  const persistProgress = useCallback((position: number) => {
    const item = currentRef.current;
    if (!item || item.videoId.startsWith("demo-")) return;
    writeAudiobookProgress(itemToProgress(item, Math.max(0, position)));
  }, []);

  const syncTimeFromPlayer = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    try {
      const t = player.getCurrentTime();
      const d = player.getDuration();
      if (Number.isFinite(t)) setPositionSec(t);
      if (Number.isFinite(d) && d > 0) setDurationSec(d);
    } catch {
      /* player not ready */
    }
  }, []);

  const setPlaylist = useCallback((items: AudiobookItem[]) => {
    playlistRef.current = items;
    setPlaylistState(items);
  }, []);

  const loadItem = useCallback(
    (item: AudiobookItem, startSec = 0, autoplay = true) => {
      const player = playerRef.current;
      currentRef.current = item;
      setCurrent(item);
      setPendingResume(null);
      if (item.durationSec) setDurationSec(item.durationSec);

      if (item.videoId.startsWith("demo-")) {
        setIsPlaying(false);
        setPositionSec(startSec);
        return;
      }

      if (!player) return;

      if (autoplay) {
        player.loadVideoById(item.videoId, startSec);
      } else {
        player.cueVideoById(item.videoId, startSec);
        setPositionSec(startSec);
      }
    },
    []
  );

  const play = useCallback(
    (item: AudiobookItem) => {
      loadItem(item, 0, true);
    },
    [loadItem]
  );

  const resumeLast = useCallback(() => {
    const stored = pendingResume ?? readAudiobookProgress();
    if (!stored) return;
    const item = storedToItem(stored);
    loadItem(item, stored.positionSec, true);
  }, [loadItem, pendingResume]);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    const item = currentRef.current;
    if (!player || !item) {
      if (pendingResume) resumeLast();
      return;
    }
    if (item.videoId.startsWith("demo-")) return;

    const state = player.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
      player.pauseVideo();
      persistProgress(player.getCurrentTime());
    } else {
      player.playVideo();
    }
  }, [pendingResume, persistProgress, resumeLast]);

  const seek = useCallback(
    (sec: number) => {
      const player = playerRef.current;
      if (!player || !currentRef.current) return;
      player.seekTo(sec, true);
      setPositionSec(sec);
      persistProgress(sec);
    },
    [persistProgress]
  );

  const playAdjacent = useCallback(
    (delta: number) => {
      const list = playlistRef.current;
      const active = currentRef.current;
      if (list.length === 0 || !active) return;
      const idx = list.findIndex((i) => i.videoId === active.videoId);
      if (idx < 0) return;
      const nextIdx = idx + delta;
      if (nextIdx < 0 || nextIdx >= list.length) return;
      play(list[nextIdx]!);
    },
    [play]
  );

  const next = useCallback(() => playAdjacent(1), [playAdjacent]);
  const prev = useCallback(() => playAdjacent(-1), [playAdjacent]);

  const getNowPlayingTitle = useCallback(() => {
    const player = playerRef.current;
    if (player && currentRef.current && !currentRef.current.videoId.startsWith("demo-")) {
      try {
        const data = player.getVideoData();
        if (data.title) return data.title;
      } catch {
        /* ignore */
      }
    }
    return currentRef.current?.title ?? pendingResume?.title ?? "";
  }, [pendingResume]);

  useEffect(() => {
    let cancelled = false;

    void loadYouTubeIframeApi()
      .then(() => {
        if (cancelled) return;

        if (sharedPlayer) {
          playerRef.current = sharedPlayer;
          setPlayerReady(true);

          const stored = readAudiobookProgress();
          if (
            stored &&
            !stored.videoId.startsWith("demo-") &&
            !currentRef.current
          ) {
            const item = storedToItem(stored);
            currentRef.current = item;
            setCurrent(item);
            setPendingResume(stored);
            sharedPlayer.cueVideoById(stored.videoId, stored.positionSec);
            setPositionSec(stored.positionSec);
            if (stored.durationSec) setDurationSec(stored.durationSec);
          }
          return;
        }

        const host = ensurePlayerHost();
        host.replaceChildren();

        sharedPlayer = new YT.Player(host, {
          height: "1",
          width: "1",
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              playerRef.current = sharedPlayer;
              setPlayerReady(true);

              const stored = readAudiobookProgress();
              if (stored && !stored.videoId.startsWith("demo-")) {
                const item = storedToItem(stored);
                currentRef.current = item;
                setCurrent(item);
                setPendingResume(stored);
                sharedPlayer?.cueVideoById(stored.videoId, stored.positionSec);
                setPositionSec(stored.positionSec);
                if (stored.durationSec) setDurationSec(stored.durationSec);
              }
            },
            onStateChange: (event) => {
              const playing = event.data === YT.PlayerState.PLAYING;
              setIsPlaying(playing);
              syncTimeFromPlayer();
              if (
                event.data === YT.PlayerState.PAUSED ||
                event.data === YT.PlayerState.ENDED
              ) {
                persistProgress(playerRef.current?.getCurrentTime() ?? 0);
              }
            },
            onError: () => {
              setIsPlaying(false);
            },
          },
        });
        playerRef.current = sharedPlayer;
      })
      .catch(() => {
        /* iframe API blocked */
      });

    return () => {
      cancelled = true;
      /* Do not call YT.Player.destroy() — it fights React reconciliation on remount. */
    };
  }, [persistProgress, syncTimeFromPlayer]);

  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      syncTimeFromPlayer();
    }, 1000);
    return () => window.clearInterval(id);
  }, [isPlaying, syncTimeFromPlayer]);

  useEffect(() => {
    if (!isPlaying && !current) return;
    const id = window.setInterval(() => {
      const player = playerRef.current;
      if (!player || !currentRef.current) return;
      if (player.getPlayerState() === YT.PlayerState.PLAYING) {
        persistProgress(player.getCurrentTime());
      }
    }, PROGRESS_SAVE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [isPlaying, current, persistProgress]);

  useEffect(() => {
    const onBeforeUnload = () => {
      const player = playerRef.current;
      if (player && currentRef.current) {
        persistProgress(player.getCurrentTime());
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [persistProgress]);

  const value = useMemo(
    (): AudiobooksContextValue => ({
      current,
      isPlaying,
      positionSec,
      durationSec,
      playerReady,
      pendingResume,
      playlist,
      setPlaylist,
      play,
      togglePlay,
      next,
      prev,
      seek,
      resumeLast,
      getNowPlayingTitle,
    }),
    [
      current,
      isPlaying,
      positionSec,
      durationSec,
      playerReady,
      pendingResume,
      playlist,
      setPlaylist,
      play,
      togglePlay,
      next,
      prev,
      seek,
      resumeLast,
      getNowPlayingTitle,
    ]
  );

  return (
    <AudiobooksContext.Provider value={value}>{children}</AudiobooksContext.Provider>
  );
}

export function useAudiobooks(): AudiobooksContextValue {
  const ctx = useContext(AudiobooksContext);
  if (!ctx) {
    throw new Error("useAudiobooks must be used within AudiobooksProvider");
  }
  return ctx;
}
