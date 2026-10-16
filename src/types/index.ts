export interface Tag {
  id: number;
  city_id: number;
  name: string;
  parent_id: number | null;
  /** 1 — тег создан автокластеризацией */
  is_auto: number;
}

export interface City {
  id: number;
  name: string;
  center_lat: number;
  center_lng: number;
  default_zoom: number;
}

/** Данные для создания города (без id). */
export interface NewCity {
  name: string;
  center_lat: number;
  center_lng: number;
  default_zoom: number;
}

export interface Place {
  osm_id: string; // 'node/123'
  lat: number;
  lng: number;
  name: string;
  category: string;
  allTags: Record<string, string>;
}

export interface Mark {
  osm_id: string;
  tag_id: number;
}

export interface Bbox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

/** Сырой элемент ответа Overpass API */
export interface OsmElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/**
 * Минимальные типы для JavaScript API 2.x Яндекс Карт
 * (подключается тегом <script> — см. services/yandexMaps.ts).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type YMapAny = any;

export interface YMapsNamespace {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

declare global {
  interface Window {
    ymaps?: YMapsNamespace;
  }
}
