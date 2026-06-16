"use client";

import { useCallback, useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { useDeviceLocation } from "@/context/DeviceLocationContext";

interface LocationMapModuleProps {
  compact?: boolean;
}

const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export function LocationMapModule({ compact = false }: LocationMapModuleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").CircleMarker | null>(null);
  const haloRef = useRef<import("leaflet").CircleMarker | null>(null);
  const userMovedRef = useRef(false);
  const { lat, lon, label, source } = useDeviceLocation();

  const fitMapToPoint = useCallback(
    (map: import("leaflet").Map, latitude: number, longitude: number) => {
      const latSpan = compact ? 0.022 : 0.016;
      const lonSpan = compact ? 0.034 : 0.05;
      map.fitBounds(
        [
          [latitude - latSpan, longitude - lonSpan],
          [latitude + latSpan, longitude + lonSpan],
        ],
        { animate: false, padding: [4, 8] }
      );
    },
    [compact]
  );

  const zoomMap = useCallback((delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    userMovedRef.current = true;
    if (delta > 0) map.zoomIn();
    else map.zoomOut();
  }, []);

  const recenterMap = useCallback(() => {
    if (lat == null || lon == null || !mapRef.current) return;
    userMovedRef.current = false;
    fitMapToPoint(mapRef.current, lat, lon);
  }, [fitMapToPoint, lat, lon]);

  useEffect(() => {
    if (lat == null || lon == null || !containerRef.current || mapRef.current) {
      return;
    }

    let cancelled = false;
    const container = containerRef.current;
    const startLat = lat;
    const startLon = lon;

    let panning = false;
    let lastPoint: [number, number] | null = null;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      panning = true;
      lastPoint = [event.clientX, event.clientY];
      userMovedRef.current = true;
      container.setPointerCapture(event.pointerId);
      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!panning || !lastPoint || !mapRef.current) return;
      const dx = event.clientX - lastPoint[0];
      const dy = event.clientY - lastPoint[1];
      mapRef.current.panBy([-dx, -dy], { animate: false });
      lastPoint = [event.clientX, event.clientY];
      event.preventDefault();
    };

    const endPan = (event: PointerEvent) => {
      if (!panning) return;
      panning = false;
      lastPoint = null;
      if (container.hasPointerCapture(event.pointerId)) {
        container.releasePointerCapture(event.pointerId);
      }
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (!mapRef.current) return;
      userMovedRef.current = true;
      if (event.deltaY < 0) mapRef.current.zoomIn();
      else mapRef.current.zoomOut();
    };

    const onDoubleClick = (event: MouseEvent) => {
      event.preventDefault();
      zoomMap(1);
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", endPan);
    container.addEventListener("pointercancel", endPan);
    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("dblclick", onDoubleClick);

    void (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(container, {
        center: [startLat, startLon],
        zoom: compact ? 13 : 14,
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false,
        attributionControl: true,
      });

      L.tileLayer(OSM_TILE_URL, {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      }).addTo(map);

      haloRef.current = L.circleMarker([startLat, startLon], {
        radius: compact ? 14 : 18,
        color: "#ffffff",
        fillColor: "#ff5a36",
        fillOpacity: 0.18,
        weight: 2,
        opacity: 0.85,
        interactive: false,
      }).addTo(map);

      markerRef.current = L.circleMarker([startLat, startLon], {
        radius: compact ? 6 : 8,
        color: "#ffffff",
        fillColor: "#ff5a36",
        fillOpacity: 1,
        weight: 2,
        interactive: false,
      }).addTo(map);

      mapRef.current = map;
      fitMapToPoint(map, startLat, startLon);

      map.whenReady(() => {
        if (cancelled || !mapRef.current) return;
        map.invalidateSize();
        fitMapToPoint(map, startLat, startLon);
      });
    })();

    return () => {
      cancelled = true;
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", endPan);
      container.removeEventListener("pointercancel", endPan);
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("dblclick", onDoubleClick);
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      haloRef.current = null;
      userMovedRef.current = false;
    };
  }, [compact, fitMapToPoint, zoomMap]);

  useEffect(() => {
    if (lat == null || lon == null || !mapRef.current) return;

    markerRef.current?.setLatLng([lat, lon]);
    haloRef.current?.setLatLng([lat, lon]);

    if (!userMovedRef.current) {
      mapRef.current.panTo([lat, lon], { animate: true, duration: 0.35 });
    }
  }, [lat, lon]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      mapRef.current?.invalidateSize();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  const ready = lat != null && lon != null;
  const mapUrl = ready
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`
    : undefined;

  const unitClass = [
    "footer-map-unit",
    compact ? "footer-map-unit--compact" : "",
    ready ? "" : "footer-map-unit--loading",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={unitClass} aria-label={ready ? `Map for ${label}` : "Loading map"}>
      <div className="footer-map-head">
        <span className="footer-map-title">MAP</span>
        <span className="label">{source === "loading" ? "Определение…" : label}</span>
        {source === "live" && (
          <span className="footer-map-live" aria-label="Живая локация">
            <span className="footer-map-live-dot" aria-hidden />
            ЗДЕСЬ
          </span>
        )}
        {source === "fallback" && (
          <span className="footer-map-fallback" aria-label="Домашние координаты">
            HOME
          </span>
        )}
        <div className="footer-map-actions">
          <button
            type="button"
            className="footer-map-action"
            aria-label="Приблизить"
            title="Приблизить"
            disabled={!ready}
            onClick={() => zoomMap(1)}
          >
            +
          </button>
          <button
            type="button"
            className="footer-map-action"
            aria-label="Отдалить"
            title="Отдалить"
            disabled={!ready}
            onClick={() => zoomMap(-1)}
          >
            −
          </button>
          <button
            type="button"
            className="footer-map-action"
            aria-label="Вернуться к метке"
            title="К метке"
            disabled={!ready}
            onClick={recenterMap}
          >
            ◎
          </button>
          {mapUrl && (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-map-action footer-map-action--link"
              aria-label="Открыть в OpenStreetMap"
              title="OpenStreetMap"
            >
              OSM
            </a>
          )}
        </div>
      </div>
      <div ref={containerRef} className="footer-map-canvas" aria-hidden={!ready} />
    </div>
  );
}
