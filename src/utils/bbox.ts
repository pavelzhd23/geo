import type { Bbox } from "../types";

/** Возвращает true, если inner полностью содержится в outer. */
export function bboxContains(outer: Bbox, inner: Bbox): boolean {
  return (
    outer.minLat <= inner.minLat &&
    outer.maxLat >= inner.maxLat &&
    outer.minLng <= inner.minLng &&
    outer.maxLng >= inner.maxLng
  );
}

/** Строка bbox для Overpass-запроса: (south,west,north,east) */
export function bboxToString(b: Bbox): string {
  return `${b.minLat},${b.minLng},${b.maxLat},${b.maxLng}`;
}

/** Уникальный ключ bbox для кэша. */
export function bboxKey(b: Bbox): string {
  return bboxToString(roundBbox(b));
}

const PRECISION = 1e6;

export function roundBbox(b: Bbox): Bbox {
  return {
    minLat: Math.round(b.minLat * PRECISION) / PRECISION,
    minLng: Math.round(b.minLng * PRECISION) / PRECISION,
    maxLat: Math.round(b.maxLat * PRECISION) / PRECISION,
    maxLng: Math.round(b.maxLng * PRECISION) / PRECISION,
  };
}
