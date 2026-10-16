import { useCallback, useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { Bbox } from "../types";

const DEBOUNCE_MS = 800;

/**
 * Отслеживает видимую область карты: при moveend/zoomend (debounce 800 мс)
 * вызывает onBbox с текущим bbox.
 */
export function useMapBbox(
  map: LeafletMap | null,
  onBbox: (bbox: Bbox) => void
): { refresh: () => void } {
  const timerRef = useRef<number | null>(null);
  const cbRef = useRef(onBbox);
  cbRef.current = onBbox;

  const emit = useCallback((m: LeafletMap) => {
    const b = m.getBounds();
    cbRef.current({
      minLat: b.getSouth(),
      minLng: b.getWest(),
      maxLat: b.getNorth(),
      maxLng: b.getEast(),
    });
  }, []);

  useEffect(() => {
    if (!map) return;
    const handler = () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        emit(map);
      }, DEBOUNCE_MS);
    };
    map.on("moveend", handler); // moveend срабатывает и после zoomend
    map.on("zoomend", handler);
    // первичная загрузка
    emit(map);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      map.off("moveend", handler);
      map.off("zoomend", handler);
    };
  }, [map, emit]);

  const refresh = useCallback(() => {
    if (map) emit(map);
  }, [map, emit]);

  return { refresh };
}
