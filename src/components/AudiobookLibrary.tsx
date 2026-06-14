"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect } from "react";
import { useAudiobooks } from "@/context/AudiobooksContext";
import { formatAudiobookDuration } from "@/lib/audiobooksPlayer";
import type { AudiobookData, AudiobookItem } from "@/types/modules";

interface AudiobookLibraryProps {
  open: boolean;
  onClose: () => void;
  data: AudiobookData | null;
  loading: boolean;
}

export function AudiobookLibrary({
  open,
  onClose,
  data,
  loading,
}: AudiobookLibraryProps) {
  const { current, play, setPlaylist } = useAudiobooks();

  useEffect(() => {
    if (data?.items.length) {
      setPlaylist(data.items);
    }
  }, [data, setPlaylist]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleSelect = useCallback(
    (item: AudiobookItem) => {
      play(item);
      onClose();
    },
    [play, onClose]
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            className="audiobook-library-backdrop"
            aria-label="Закрыть библиотеку"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="audiobook-library"
            role="dialog"
            aria-modal="true"
            aria-label="Библиотека аудиокниг"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="audiobook-library-head">
              <div>
                <div className="label">Audiobooks</div>
                <div className="audiobook-library-channel">
                  {data?.channelTitle ?? "Голос Коваленко — аудиокниги"}
                </div>
              </div>
              <button
                type="button"
                className="audiobook-library-close"
                onClick={onClose}
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            <div className="audiobook-library-body">
              {loading && !data ? (
                <div className="audiobook-library-status">Загрузка полки…</div>
              ) : !data?.items.length ? (
                <div className="audiobook-library-status">Нет выпусков</div>
              ) : (
                <div className="audiobook-library-grid">
                  {data.items.map((item) => {
                    const isActive = current?.videoId === item.videoId;
                    return (
                      <button
                        key={item.videoId}
                        type="button"
                        className={`audiobook-library-card${isActive ? " is-active" : ""}`}
                        onClick={() => handleSelect(item)}
                      >
                        <div className="audiobook-library-thumb-wrap">
                          {item.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.thumbnailUrl}
                              alt=""
                              className="audiobook-library-thumb"
                              loading="lazy"
                            />
                          ) : (
                            <div className="audiobook-library-thumb audiobook-library-thumb--empty" />
                          )}
                        </div>
                        <div className="audiobook-library-card-title">{item.title}</div>
                        {item.durationSec != null && (
                          <div className="audiobook-library-card-duration">
                            {formatAudiobookDuration(item.durationSec)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
