import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import SelectionMode from "./SelectionMode";
import YMapController from "./YMapController";
import { useYMapBbox } from "../../hooks/useYMapBbox";
import { useOverpass } from "../../hooks/useOverpass";
import { useMapStore } from "../../stores/mapStore";
import { useFilterStore } from "../../stores/filterStore";
import { useSelectionStore } from "../../stores/selectionStore";
import { hasYandexApiKey } from "../../services/yandexMaps";
import type { Bbox } from "../../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type YMapInstance = any;

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [map, setMap] = useState<YMapInstance>(null);
  const [failed, setFailed] = useState(false);
  const loading = useMapStore((s) => s.loading);
  const selectionMode = useSelectionStore((s) => s.mode);
  const containerRef = useRef<HTMLDivElement>(null);

  const { load } = useOverpass();

  const handleBbox = useCallback(
    (bbox: Bbox) => {
      void load(bbox);
    },
    [load]
  );

  useYMapBbox(map, handleBbox);

  // Выход из режима выделения по Escape
  useEffect(() => {
    if (!selectionMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useSelectionStore.getState().exitMode();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectionMode]);

  // Нет ключа API — понятное сообщение вместо пустой карты
  if (!hasYandexApiKey()) {
    return (
      <div className="map-wrap">
        <div className="map-message">{t("map.noApiKey")}</div>
      </div>
    );
  }

  return (
    <div className={`map-wrap ${selectionMode ? "map-wrap-selection" : ""}`}>
      <div ref={containerRef} className="ymap-container" />
      {!failed && (
        <YMapController
          containerRef={containerRef}
          onReady={setMap}
          onError={() => setFailed(true)}
        />
      )}

      {failed && <div className="map-message">{t("map.loadError")}</div>}

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
