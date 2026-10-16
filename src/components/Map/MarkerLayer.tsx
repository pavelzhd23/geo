import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import type { Place } from "../../types";
import { categoryIcon } from "../../utils/categoryIcons";
import { useMapStore } from "../../stores/mapStore";
import { useMarksStore } from "../../stores/marksStore";
import { useFilterStore } from "../../stores/filterStore";
import { useSelectionStore } from "../../stores/selectionStore";

/** Цвет круга по категории; без названия — серый. */
function colorForPlace(p: Place): string {
  if (!p.name) return "#9e9e9e";
  let hash = 0;
  for (let i = 0; i < p.category.length; i++) {
    hash = (hash * 31 + p.category.charCodeAt(i)) >>> 0;
  }
  return `hsl(${hash % 360}, 70%, 45%)`;
}

function makeIcon(
  place: Place,
  state: { marked: boolean; selected: boolean }
): L.DivIcon {
  const size = state.selected ? 40 : 32;
  const border = state.selected
    ? "3px solid #1565c0"
    : state.marked
      ? "3px solid #2e7d32"
      : "2px solid rgba(255,255,255,.9)";
  const html =
    `<div class="poi-marker" style="width:${size}px;height:${size}px;` +
    `background:${colorForPlace(place)};border:${border}">` +
    `<span>${categoryIcon(place.category)}</span></div>`;
  return L.divIcon({
    html,
    className: "poi-marker-wrap",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/**
 * Рендер маркеров через императивный Leaflet-слой: при лимите в 500 маркеров
 * это заметно быстрее декларативного react-leaflet.
 */
export default function MarkerLayer() {
  const map = useMap();
  const places = useMapStore((s) => s.places);
  const selectPlace = useMapStore((s) => s.selectPlace);
  const markedIds = useMarksStore((s) => s.markedIds);
  const activeTagId = useFilterStore((s) => s.activeTagId);
  const matchingIds = useFilterStore((s) => s.matchingIds);
  const selectionMode = useSelectionStore((s) => s.mode);
  const selected = useSelectionStore((s) => s.selected);
  const toggleSelect = useSelectionStore((s) => s.toggle);

  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Актуальные обработчики для click (чтобы не пересоздавать маркеры)
  const handlersRef = useRef<{
    mode: boolean;
    toggle: (id: string) => void;
    open: (p: Place) => void;
  }>({ mode: false, toggle: () => undefined, open: () => undefined });
  handlersRef.current = { mode: selectionMode, toggle: toggleSelect, open: selectPlace };

  // Синхронизация множества маркеров с массивом places + добавление на карту
  useEffect(() => {
    const markers = markersRef.current;
    const visible = new Set(places.map((p) => p.osm_id));

    for (const [id, marker] of markers) {
      if (!visible.has(id)) {
        markers.delete(id);
        map.removeLayer(marker);
      }
    }
    for (const p of places) {
      if (markers.has(p.osm_id)) continue;
      const marker = L.marker([p.lat, p.lng], {
        icon: makeIcon(p, { marked: false, selected: false }),
      });
      marker.on("click", () => {
        const h = handlersRef.current;
        if (h.mode) h.toggle(p.osm_id);
        else h.open(p);
      });
      marker.bindTooltip(p.name || p.osm_id, { direction: "top", offset: [0, -14] });
      markers.set(p.osm_id, marker);
      marker.addTo(map);
    }
  }, [places, map]);

  // Перекраска и прозрачность при смене состояний
  useEffect(() => {
    for (const p of places) {
      const marker = markersRef.current.get(p.osm_id);
      if (!marker) continue;
      marker.setIcon(
        makeIcon(p, { marked: markedIds.has(p.osm_id), selected: selected.has(p.osm_id) })
      );
      const dimmed = activeTagId != null && !matchingIds.has(p.osm_id);
      marker.setOpacity(dimmed ? 0.2 : 1);
    }
  }, [places, markedIds, activeTagId, matchingIds, selected]);

  return null;
}
