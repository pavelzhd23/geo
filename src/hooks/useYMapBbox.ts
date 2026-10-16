import { useCallback, useEffect, useRef } from "react";
import type { Bbox } from "../types";

const DEBOUNCE_MS = 800;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type YMapInstance = any;

/** Текущий bbox видимой области Яндекс-карты. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getBboxFromYMap(map: YMapInstance): Bbox {
  const region = map.bounds; // границы видимой области
  const sw = region.at(0) as [number, number]; // юго-запад [lat, lng]
  const ne = region.at(1) as [number, number]; // северо-восток [lat, lng]
  return {
    minLat: Math.min(sw[0], ne[0]),
    minLng: Math.min(sw[1], ne[1]),
    maxLat: Math.max(sw[0], ne[0]),
    maxLng: Math.max(sw[1], ne[1]),
  };
}

/**
 * Отслеживает видимую область Яндекс-карты: при moveend/zoomend
 * (debounce 800 мс) вызывает onBbox с текущим bbox.
 */
export function useYMapBbox(
  map: YMapInstance,
  onBbox: (bbox: Bbox) => void
): { refresh: () => void } {
  const timerRef = useRef<number | null>(null);
  const cbRef = useRef(onBbox);
  cbRef.current = onBbox;

  const emit = useCallback((m: YMapInstance) => {
    cbRef.current(getBboxFromYMap(m));
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

    // moveend срабатывает также после зума; подписываемся на оба для надёжности
    map.events.add("moveend", handler);
    map.events.add("zoomend", handler);

    // первичная загрузка
    emit(map);

    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      map.events.remove("moveend", handler);
      map.events.remove("zoomend", handler);
    };
  }, [map, emit]);

  const refresh = useCallback(() => {
    if (map) emit(map);
  }, [map, emit]);

  return { refresh };
}
