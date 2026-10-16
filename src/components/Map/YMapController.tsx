import { useEffect, useRef } from "react";
import type { Place, YMapsNamespace } from "../../types";
import { categoryIcon } from "../../utils/categoryIcons";
import { getYMaps } from "../../services/yandexMaps";
import { useMapStore } from "../../stores/mapStore";
import { useMarksStore } from "../../stores/marksStore";
import { useFilterStore } from "../../stores/filterStore";
import { useSelectionStore } from "../../stores/selectionStore";

/* ------------------------------ Иконки маркеров ------------------------------ */

/** Цвет круга по категории; без названия — серый. */
export function colorForPlace(p: Place): string {
  if (!p.name) return "#9e9e9e";
  let hash = 0;
  for (let i = 0; i < p.category.length; i++) {
    hash = (hash * 31 + p.category.charCodeAt(i)) >>> 0;
  }
  return `hsl(${hash % 360}, 70%, 45%)`;
}

/** SVG «цветной круг с символом категории» в виде data URI. */
function markerHref(place: Place, size: number, border: string, borderWidth: number): string {
  const c = size / 2;
  const r = c - borderWidth / 2 - 0.5;
  const fill = colorForPlace(place);
  const label = categoryIcon(place.category);
  const fontSize = Math.round(size * 0.45);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<circle cx="${c}" cy="${c}" r="${r}" fill="${fill}" stroke="${border}" stroke-width="${borderWidth}"/>` +
    `<text x="${c}" y="${c}" text-anchor="middle" dominant-baseline="central" ` +
    `font-size="${fontSize}" font-family="system-ui,sans-serif" fill="#fff" font-weight="600">${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

interface PlacemarkVisual {
  marked: boolean;
  selected: boolean;
  dimmed: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyPlacemarkStyle(pm: any, place: Place, v: PlacemarkVisual): void {
  const size = v.selected ? 40 : 32;
  const border = v.selected
    ? "#1565c0"
    : v.marked
      ? "#2e7d32"
      : "rgba(255,255,255,.9)";
  const borderWidth = v.selected || v.marked ? 3 : 2;
  pm.options.set({
    iconLayout: "default#image",
    iconImageHref: markerHref(place, size, border, borderWidth),
    iconImageSize: [size, size],
    iconImageOffset: [-size / 2, -size / 2],
    opacity: v.dimmed ? 0.2 : 1,
    hasHint: true,
  });
  pm.properties.set("hintContent", place.name || place.osm_id);
}

/* ------------------------------ Контроллер карты ------------------------------ */

/**
 * Императивная обёрка над Яндекс Картами (JS API 2.x):
 * создаёт карту, синхронизирует плацмарки с places из стора,
 * перекрашивает их по состояниям (пометки / выделение / фильтр).
 */
export default function YMapController({
  containerRef,
  onReady,
  onError,
}: {
  containerRef: React.RefObject<HTMLDivElement>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onReady: (map: any) => void;
  onError: () => void;
}) {
  const ymapsRef = useRef<YMapsNamespace | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const collectionRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const placemarksRef = useRef<Map<string, any>>(new Map());

  const places = useMapStore((s) => s.places);
  const selectPlace = useMapStore((s) => s.selectPlace);
  const markedIds = useMarksStore((s) => s.markedIds);
  const activeTagId = useFilterStore((s) => s.activeTagId);
  const matchingIds = useFilterStore((s) => s.matchingIds);
  const selectionMode = useSelectionStore((s) => s.mode);
  const selected = useSelectionStore((s) => s.selected);
  const toggleSelect = useSelectionStore((s) => s.toggle);

  // актуальные обработчики клика, чтобы не пересоздавать плацмарки
  const handlersRef = useRef<{
    mode: boolean;
    toggle: (id: string) => void;
    open: (p: Place) => void;
  }>({ mode: false, toggle: () => undefined, open: () => undefined });
  handlersRef.current = { mode: selectionMode, toggle: toggleSelect, open: selectPlace };

  // Создание карты (однократно)
  useEffect(() => {
    let cancelled = false;
    const el = containerRef.current;
    if (!el) return;

    getYMaps()
      .then((ymaps) => {
        if (cancelled || mapRef.current) return;
        ymapsRef.current = ymaps;

        const map = new ymaps.Map(el, {
          center: [55.752, 37.6175], // Москва
          zoom: 13,
          controls: ["zoomControl", "scaleLine"],
        });
        map.behaviors.enable(["drag", "scrollZoom"]);

        const collection = new ymaps.GeoObjectCollection({}, { draggable: false });
        map.geoObjects.add(collection);

        mapRef.current = map;
        collectionRef.current = collection;
        onReady(map);
      })
      .catch((err) => {
        console.error("Yandex Maps load failed:", err);
        onError();
      });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        try {
          mapRef.current.destroy();
        } catch {
          /* noop */
        }
        mapRef.current = null;
        collectionRef.current = null;
        placemarksRef.current.clear();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Синхронизация множества плацмарков с массивом places
  useEffect(() => {
    const ymaps = ymapsRef.current;
    const collection = collectionRef.current;
    if (!ymaps || !collection) return;

    const placemarks = placemarksRef.current;
    const visible = new Set(places.map((p) => p.osm_id));

    for (const [id, pm] of placemarks) {
      if (!visible.has(id)) {
        placemarks.delete(id);
        collection.remove(pm);
      }
    }
    for (const p of places) {
      if (placemarks.has(p.osm_id)) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pm: any = new ymaps.Placemark([p.lat, p.lng], {}, {});
      pm.events.add("click", (e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        const h = handlersRef.current;
        if (h.mode) h.toggle(p.osm_id);
        else h.open(p);
      });
      placemarks.set(p.osm_id, pm);
      collection.add(pm);
    }
  }, [places]);

  // Перекраска и прозрачность при смене состояний
  useEffect(() => {
    for (const p of places) {
      const pm = placemarksRef.current.get(p.osm_id);
      if (!pm) continue;
      applyPlacemarkStyle(pm, p, {
        marked: markedIds.has(p.osm_id),
        selected: selected.has(p.osm_id),
        dimmed: activeTagId != null && !matchingIds.has(p.osm_id),
      });
    }
  }, [places, markedIds, activeTagId, matchingIds, selected]);

  return null;
}
