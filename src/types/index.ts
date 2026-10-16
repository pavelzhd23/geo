export interface Tag {
  id: number;
  name: string;
  parent_id: number | null;
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
