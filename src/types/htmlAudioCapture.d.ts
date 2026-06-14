/** Non-standard capture APIs used by Web Audio fallback (Chrome / legacy Firefox). */
interface HTMLAudioElement {
  captureStream?(): MediaStream;
  mozCaptureStream?(): MediaStream;
}
