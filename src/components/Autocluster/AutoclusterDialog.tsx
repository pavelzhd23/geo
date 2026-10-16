import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAutoclusterStore } from "../../stores/autoclusterStore";
import { useMapStore } from "../../stores/mapStore";
import ClusterPreview from "./ClusterPreview";
import ClusterList from "./ClusterList";
import type { Place } from "../../types";

/**
 * Модалка автокластеризации: параметры DBSCAN/OPTICS, live-предпросмотр,
 * запуск, переименование кластеров и сохранение в БД.
 */
export default function AutoclusterDialog() {
  const { t } = useTranslation();
  const isOpen = useAutoclusterStore((s) => s.isOpen);
  const params = useAutoclusterStore((s) => s.params);
  const preview = useAutoclusterStore((s) => s.preview);
  const running = useAutoclusterStore((s) => s.running);
  const progress = useAutoclusterStore((s) => s.progress);
  const result = useAutoclusterStore((s) => s.result);
  const setParams = useAutoclusterStore((s) => s.setParams);
  const computePreview = useAutoclusterStore((s) => s.computePreview);
  const run = useAutoclusterStore((s) => s.run);
  const save = useAutoclusterStore((s) => s.save);
  const close = useAutoclusterStore((s) => s.close);

  const places = useMapStore((s) => s.places);
  const currentBbox = useMapStore((s) => s.currentBbox);

  /** Набор точек по выбранной области: видимое на карте / всё загруженное. */
  const scopePlaces: Place[] = useMemo(() => {
    if (params.scope === "visible" && currentBbox) {
      return places.filter(
        (p) =>
          p.lat >= currentBbox.minLat &&
          p.lat <= currentBbox.maxLat &&
          p.lng >= currentBbox.minLng &&
          p.lng <= currentBbox.maxLng
      );
    }
    return places;
  }, [places, currentBbox, params.scope]);

  // live-предпросмотр при изменении параметров/набора
  useEffect(() => {
    if (!isOpen) return;
    computePreview(scopePlaces);
  }, [isOpen, params.eps, params.minPts, params.autoEps, params.scope, scopePlaces, computePreview]);

  if (!isOpen) return null;

  const showProgress = scopePlaces.length > 500;

  return (
    <div className="dialog-backdrop" onClick={close}>
      <div className="dialog dialog-wide" onClick={(e) => e.stopPropagation()}>
        <h3>{t("autocluster.title")}</h3>

        {!result ? (
          <>
            <label className="field-label">
              {t("autocluster.radius")}: {params.eps} м
            </label>
            <input
              type="range"
              min={50}
              max={2000}
              step={50}
              value={params.eps}
              disabled={params.autoEps}
              onChange={(e) => setParams({ eps: Number(e.target.value) })}
            />

            <label className="field-label">{t("autocluster.minPts")}</label>
            <input
              className="input input-number"
              type="number"
              min={2}
              max={50}
              value={params.minPts}
              onChange={(e) =>
                setParams({ minPts: Math.max(2, Math.min(50, Number(e.target.value) || 2)) })
              }
            />

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={params.autoEps}
                onChange={(e) => setParams({ autoEps: e.target.checked })}
              />
              {t("autocluster.autoEps")}
            </label>

            <div className="field-label">{t("autocluster.scope")}</div>
            <label className="radio-row">
              <input
                type="radio"
                name="ac-scope"
                checked={params.scope === "all"}
                onChange={() => setParams({ scope: "all" })}
              />
              {t("autocluster.scopeAll")}
            </label>
            <label className="radio-row">
              <input
                type="radio"
                name="ac-scope"
                checked={params.scope === "visible"}
                onChange={() => setParams({ scope: "visible" })}
              />
              {t("autocluster.scopeVisible")}
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={params.includeNoise}
                onChange={(e) => setParams({ includeNoise: e.target.checked })}
              />
              {t("autocluster.includeNoise")}
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={params.removeExisting}
                onChange={(e) => setParams({ removeExisting: e.target.checked })}
              />
              {t("autocluster.removeExisting")}
            </label>

            <ClusterPreview preview={preview} total={scopePlaces.length} />

            {running && showProgress && (
              <div className="progress-track">
                <div className="progress-bar" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            )}

            <div className="dialog-actions">
              <button
                className="btn btn-primary"
                disabled={running || scopePlaces.length === 0}
                onClick={() => void run(scopePlaces)}
              >
                {t("autocluster.run")}
              </button>
              <button className="btn" onClick={close}>
                {t("autocluster.cancel")}
              </button>
            </div>
          </>
        ) : (
          <>
            <ClusterList />
            <div className="dialog-actions">
              <button className="btn btn-primary" onClick={() => void save()}>
                {t("autocluster.save")}
              </button>
              <button className="btn" onClick={close}>
                {t("autocluster.cancel")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
