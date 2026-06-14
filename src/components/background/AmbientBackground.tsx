"use client";

export function AmbientBackground() {
  return (
    <div className="ambient-bg" aria-hidden>
      {/* Layer 1 — base gradient */}
      <div className="ambient-layer layer-1 ambient-gradient" />
      {/* Layer 2 — interface grid */}
      <div className="ambient-layer layer-2 ambient-grid" />
      <div className="ambient-layer layer-2 ambient-vignette" />
      <div className="ambient-layer layer-2 ambient-glow" />
      <div className="ambient-layer layer-2 ambient-parallax" />
      <div className="ambient-layer layer-2 ambient-pulse" />
      <div className="ambient-layer layer-2 ambient-core-glow" />
    </div>
  );
}
