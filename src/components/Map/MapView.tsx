import { useCallback, useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTranslation } from "react-i18next";
import MarkerLayer from "./MarkerLayer";
import SelectionMode from "./SelectionMode";
import { useMapBbox } from "../../hooks/useMapBbox";
import { useOverpass } from "../../hooks/useOverpass";
import { useMapStore } from "../../stores/mapStore";
import { useFilterStore } from "../../stores/filterStore";
import { useSelectionStore } from "../../stores/selectionStore";
import type { Bbox } from "../../types";

const DEFAULT_CENTER: [number, number] = [55.752, 37.6175]; // Москва
const DEFAULT_ZOOM = 13;

/** Захват ссылки на экземпляр карты. */
function MapRef({ onReady }: { onReady: (m: LeafletMap) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}

function FilterBanner() {
  const { t } = useTranslation();
  const activeTagId = useFilterStore((s) => s.activeTagId);
  const activeTagName = useFilterStore((s) => s.activeTagName);
  const clear = useFilterStore((s) => s.clear);
  if (activeTagId == null) return null;
  return (
    <div className="filter-banner">
      {t("filter.active", { name: activeTagName })}
      <button className="btn btn-small" onClick={clear}>
        {t("filter.reset")}
      </button>
    </div>
  );
}

export default function MapView() {
  const { t } = useTranslation();
  const [map, setMap] = useState<LeafletMap | null>(null);
  const loading = useMapStore((s) => s.loading);
  const selectionMode = useSelectionStore((s) => s.mode);
  const { load } = useOverpass();

  const handleBbox = useCallback(
    (bbox: Bbox) => {
      void load(bbox);
    },
    [load]
  );

  useMapBbox(map, handleBbox);

  // Выход из режима выделения по Escape
  useEffect(() => {
    if (!selectionMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useSelectionStore.getState().exitMode();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectionMode]);

  return (
    <div className={`map-wrap ${selectionMode ? "map-wrap-selection" : ""}`}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ width: "100%", height: "100%" }}
        zoomControl
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />
        <MapRef onReady={setMap} />
        <MarkerLayer />
      </MapContainer>

      <div className="map-controls">
        <SelectionMode />
      </div>

      <div className="map-overlay-top">
        <FilterBanner />
      </div>

      {loading && <div className="map-loading">{t("map.loading")}</div>}
    </div>
  );
}
