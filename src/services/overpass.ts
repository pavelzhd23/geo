import type { Bbox, OsmElement, Place } from "../types";
import { bboxContains, bboxToString } from "../utils/bbox";

const ENDPOINT = "https://overpass-api.de/api/interpreter";

/** Максимум одновременно отображаемых маркеров. */
export const MAX_MARKERS = 500;

function buildQuery(bbox: Bbox): string {
  const b = bboxToString(bbox);
  const keys = ["amenity", "tourism", "shop", "historic"];
  const unions = keys
    .map((k) => `  node["${k}"](${b});\n  way["${k}"](${b});`)
    .join("\n");
  return `[out:json][timeout:25];\n(\n${unions}\n);\nout center;`;
}

const CATEGORY_KEYS = ["amenity", "tourism", "shop", "historic"] as const;

function toPlace(el: OsmElement): Place | null {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  const tags = el.tags ?? {};
  let category = "";
  for (const key of CATEGORY_KEYS) {
    if (tags[key]) {
      category = tags[key];
      break;
    }
  }
  return {
    osm_id: `${el.type}/${el.id}`,
    lat,
    lng,
    name: tags["name:ru"] || tags["name"] || "",
    category,
    allTags: tags,
  };
}

/* ------------------------------ Кэш запросов ------------------------------ */

interface CacheEntry {
  bbox: Bbox;
  places: Place[];
}

let cache: CacheEntry | null = null;

/** Сброс кэша (например, при ошибке или принудительном обновлении). */
export function clearOverpassCache(): void {
  cache = null;
}

export interface OverpassResult {
  places: Place[];
  /** true, если мест больше лимита — показаны только первые MAX_MARKERS */
  truncated: boolean;
  /** true, если данные взяты из кэша (новый bbox внутри предыдущего) */
  fromCache: boolean;
}

/**
 * Загрузка POI по bbox. Если новый bbox полностью внутри закэшированного —
 * возвращаем подмножество из кэша без сетевого запроса.
 */
export async function fetchPOIWithCache(bbox: Bbox): Promise<OverpassResult> {
  if (cache && bboxContains(cache.bbox, bbox)) {
    const subset = cache.places.filter(
      (p) => p.lat >= bbox.minLat && p.lat <= bbox.maxLat && p.lng >= bbox.minLng && p.lng <= bbox.maxLng
    );
    return {
      places: subset.slice(0, MAX_MARKERS),
      truncated: subset.length > MAX_MARKERS,
      fromCache: true,
    };
  }

  const places = await fetchPOI(bbox);
  cache = { bbox, places };
  return {
    places: places.slice(0, MAX_MARKERS),
    truncated: places.length > MAX_MARKERS,
    fromCache: false,
  };
}

/** Низкоуровневый запрос к Overpass API. */
export async function fetchPOI(bbox: Bbox): Promise<Place[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const resp = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(buildQuery(bbox)),
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`Overpass HTTP ${resp.status}`);
    const json = (await resp.json()) as { elements?: OsmElement[] };
    const seen = new Set<string>();
    const result: Place[] = [];
    for (const el of json.elements ?? []) {
      const place = toPlace(el);
      if (!place || seen.has(place.osm_id)) continue;
      seen.add(place.osm_id);
      result.push(place);
    }
    return result;
  } finally {
    clearTimeout(timer);
  }
}
