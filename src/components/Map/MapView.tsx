import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import SelectionMode from "./SelectionMode";
import YMapController from "./YMapController";
import { useYMapBbox } from "../../hooks/useYMapBbox";
import { useOverpass } from "../../hooks/useOverpass";
import { useMapStore } from "../../stores/mapStore";
import { useFilterStore } from "../../stores/filterStore";
import { useSelectionStore } from "../../stores/selectionStore";
import { useCityStore } from "../../stores/cityStore";
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

/** Возвращает текущий город из стора (без подписки). */
function getCurrentCitySafe() {
  const { cities, currentCityId } = useCityStore.getState();
  return cities.find((c) => c.id === currentCityId) ?? null;
}

/**
 * Слой выбора центра города: пока cityStore.pendingPick = true,
 * клик по карте перехватывается и координаты отправляются событием
 * "city-pick" (слушает CityCreateDialog).
 */
function CityPickLayer({ map }: { map: YMapInstance }) {
  const { t } = useTranslation();
  const pendingPick = useCityStore((s) => s.pendingPick);

  useEffect(() => {
    if (!map || !pendingPick) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onClick = (e: any) => {
      const coords = e.get("coords") as [number, number] | undefined;
      if (!coords) return;
      window.dispatchEvent(
        new CustomEvent("city-pick", { detail: { lat: coords[0], lng: coords[1] } })
      );
    };
    map.events.add("click", onClick);
    const el = map.container.getParentElement?.() as HTMLElement | undefined;
    el?.style.setProperty("cursor", "crosshair");
    return () => {
      map.events.remove("click", onClick);
      el?.style.removeProperty("cursor");
    };
  }, [map, pendingPick]);

  if (!pendingPick) return null;
  return <div className="pick-mode-hint">{t("city.pickOnMapHint")}</div>;
}

export default function MapView() {
  const { t } = useTranslation();
  const [map, setMap] = useState<YMapInstance>(null);
  const [failed, setFailed] = useState(false);
  const loading = useMapStore((s) => s.loading);
  const selectionMode = useSelectionStore((s) => s.mode);
  const containerRef = useRef<HTMLDivElement>(null);

  // Подсказка о бесплатном доступе видна только если собственный ключ не задан
  const [noteVisible, setNoteVisible] = useState(() => !hasYandexApiKey());

  const { load } = useOverpass();

  const handleBbox = useCallback(
    (bbox: Bbox) => {
      useMapStore.getState().setCurrentBbox(bbox);
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

  // Стартовое центрирование на текущем городе сразу после создания карты
  const didInitialCenter = useRef(false);
  useEffect(() => {
    if (!map || didInitialCenter.current) return;
    const city = getCurrentCitySafe();
    if (city && (city.center_lat !== 0 || city.center_lng !== 0)) {
      map.setCenter([city.center_lat, city.center_lng]);
      map.setZoom(city.default_zoom);
    }
    didInitialCenter.current = true;
  }, [map]);

  // Переключение города: центрирование + сброс фильтра/выделения + перезагрузка POI
  const currentCityId = useCityStore((s) => s.currentCityId);
  const cities = useCityStore((s) => s.cities);
  const prevCityId = useRef<number | null>(null);
  const { reload } = useOverpass();
  useEffect(() => {
    if (prevCityId.current === null) {
      prevCityId.current = currentCityId;
      return;
    }
    if (currentCityId === prevCityId.current) return;
    prevCityId.current = currentCityId;
    if (!map || currentCityId == null) return;
    const city = cities.find((c) => c.id === currentCityId);
    if (city) {
      map.setCenter([city.center_lat, city.center_lng], { duration: 400 });
      map.setZoom(city.default_zoom, { duration: 400 });
    }
    useFilterStore.getState().clear();
    useSelectionStore.getState().exitMode();
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCityId]);

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

      {failed && (
        <div className="map-message">
          {t("map.loadError")}
          <button className="btn btn-small" onClick={() => window.location.reload()}>
            {t("map.retry")}
          </button>
        </div>
      )}

      {noteVisible && !failed && (
        <div className="map-note">
          {t("map.freeTier")}
          <button
            className="btn btn-small btn-ghost"
            onClick={() => setNoteVisible(false)}
          >
            {t("map.noteClose")}
          </button>
        </div>
      )}

      <div className="map-controls">
        <SelectionMode />
      </div>

      <div className="map-overlay-top">
        <FilterBanner />
      </div>

      <CityPickLayer map={map} />

      {loading && <div className="map-loading">{t("map.loading")}</div>}
    </div>
  );
}
