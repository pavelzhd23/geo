import { DBSCAN, OPTICS } from "density-clustering";
import type { Place } from "../types";

/**
 * Ядро автокластеризации (DBSCAN / OPTICS) поверх density-clustering.
 * Библиотека работает с евклидовым расстоянием; для города используем
 * градусы с поправкой на широту (eps/111000 по широте и по долготе) —
 * точности достаточно для MVP.
 */

export interface ClusterResult {
  /** кластеры: индексы точек входного массива places */
  clusters: number[][];
  /** индексы точек шума (не попали ни в один кластер) */
  noise: number[];
}

const METERS_PER_DEGREE = 111_320;

/** Перевод радиуса в метрах в «градусное» расстояние для конкретной широты. */
export function metersToEpsDeg(meters: number, lat: number): number {
  const cosLat = Math.max(Math.cos((lat * Math.PI) / 180), 0.01);
  // среднее между широтным и долготным масштабом — компромисс для изотропной метрики
  return meters / (METERS_PER_DEGREE * Math.sqrt(cosLat));
}

/** Расстояние haversine, метры (для предпросмотра/информирования). */
export function haversineMeters(
  a: [number, number],
  b: [number, number]
): number {
  const R = 6371e3;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toPoints(places: Place[]): [number, number][] {
  return places.map((p) => [p.lat, p.lng]);
}

/** DBSCAN: фиксированный eps (метры). */
export function runDbscan(places: Place[], epsMeters: number, minPts: number): ClusterResult {
  const points = toPoints(places);
  if (points.length === 0) return { clusters: [], noise: [] };
  const meanLat = points.reduce((s, p) => s + p[0], 0) / points.length;
  const epsDeg = metersToEpsDeg(epsMeters, meanLat);

  const dbscan = new DBSCAN();
  // minPts в библиотеке — число соседей НЕ включая саму точку, добавляем 1
  const raw = dbscan.run(points, epsDeg, Math.max(1, minPts - 1)) as number[][];

  const clusters: number[][] = [];
  const used = new Set<number>();
  for (const c of raw) {
    if (!c || c.length === 0) continue;
    for (const i of c) used.add(i);
    clusters.push(c);
  }
  const noise = points.map((_, i) => i).filter((i) => !used.has(i));
  return { clusters, noise };
}

/**
 * OPTICS: авто-подбор радиуса. Строим reachability plot и режем его по
 * порогу (квантиль 0.9 от ненулевых достижимостей) — так «естественные»
 * кластеры отделяются от шума без явного eps.
 */
export function runOptics(places: Place[], minPts: number): ClusterResult & {
  suggestedEpsMeters: number;
} {
  const points = toPoints(places);
  if (points.length === 0)
    return { clusters: [], noise: [], suggestedEpsMeters: 0 };

  const meanLat = points.reduce((s, p) => s + p[0], 0) / points.length;
  // большое epsilon, чтобы OPTICS увидел все связи
  const epsDeg = metersToEpsDeg(5000, meanLat);

  const optics = new OPTICS();
  optics.run(points, epsDeg, Math.max(1, minPts - 1));
  const plot = optics.getReachabilityPlot() as [number, number][];

  const dists = plot.map(([, d]) => d).filter((d) => isFinite(d) && d > 0);
  if (dists.length === 0) {
    return {
      clusters: [],
      noise: points.map((_, i) => i),
      suggestedEpsMeters: 0,
    };
  }
  dists.sort((a, b) => a - b);
  const q = dists[Math.min(dists.length - 1, Math.floor(dists.length * 0.9))];
  const cutDeg = Math.max(q * 1.5, epsDeg / 1000);
  const suggestedEpsMeters = Math.round(
    cutDeg * METERS_PER_DEGREE * Math.sqrt(Math.max(Math.cos((meanLat * Math.PI) / 180), 0.01))
  );

  // Финальная разметка — DBSCAN с подобранным радиусом
  const res = runDbscan(places, suggestedEpsMeters, minPts);
  return { ...res, suggestedEpsMeters };
}

/** Запуск кластеризации по параметрам. */
export function clusterPlaces(
  places: Place[],
  params: { eps: number; minPts: number; autoEps: boolean }
): ClusterResult {
  return params.autoEps
    ? runOptics(places, params.minPts)
    : runDbscan(places, params.eps, params.minPts);
}
