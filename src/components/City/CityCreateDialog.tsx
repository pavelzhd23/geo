import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCityStore } from "../../stores/cityStore";
import { showToast } from "../../utils/toast";

interface Props {
  onClose: () => void;
}

type CenterMode = "manual" | "map";

/** Диалог добавления города: название, центр (вручную или кликом на карте), зум. */
export default function CityCreateDialog({ onClose }: Props) {
  const { t } = useTranslation();
  const createCity = useCityStore((s) => s.createCity);
  const setCurrentCity = useCityStore((s) => s.setCurrentCity);

  const [name, setName] = useState("");
  const [mode, setMode] = useState<CenterMode>("manual");
  const [latStr, setLatStr] = useState("");
  const [lngStr, setLngStr] = useState("");
  const [zoom, setZoom] = useState(12);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // приём координат из режима «выбрать на карте»
  useEffect(() => {
    if (mode !== "map") return;
    const onPick = (e: Event) => {
      const detail = (e as CustomEvent<{ lat: number; lng: number }>).detail;
      if (!detail) return;
      setLatStr(detail.lat.toFixed(6));
      setLngStr(detail.lng.toFixed(6));
      setMode("manual");
      useCityStore.getState().cancelPickOnMap();
    };
    window.addEventListener("city-pick", onPick);
    return () => {
      window.removeEventListener("city-pick", onPick);
      useCityStore.getState().cancelPickOnMap();
    };
  }, [mode]);

  const pickOnMap = () => {
    setMode("map");
    useCityStore.getState().startPickOnMap();
  };

  const submit = async () => {
    const trimmed = name.trim();
    const lat = Number(latStr.replace(",", "."));
    const lng = Number(lngStr.replace(",", "."));
    if (!trimmed) {
      showToast(t("city.nameRequired"), "error");
      return;
    }
    if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      showToast(t("city.centerInvalid"), "error");
      return;
    }
    setBusy(true);
    try {
      const id = await createCity({
        name: trimmed,
        center_lat: lat,
        center_lng: lng,
        default_zoom: Math.min(15, Math.max(10, Math.round(zoom))),
      });
      setCurrentCity(id);
      showToast(t("city.created"), "success");
      onClose();
    } catch {
      showToast(t("city.duplicate"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{t("city.add")}</h3>

        <label className="field-label">{t("city.name")}</label>
        <input
          ref={inputRef}
          className="input"
          value={name}
          placeholder={t("city.namePlaceholder")}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
            if (e.key === "Escape") onClose();
          }}
        />

        <label className="field-label">{t("city.center")}</label>
        <div className="city-center-row">
          <input
            className="input"
            type="number"
            step="any"
            placeholder="55.752"
            value={latStr}
            disabled={mode === "map"}
            onChange={(e) => setLatStr(e.target.value)}
          />
          <input
            className="input"
            type="number"
            step="any"
            placeholder="37.6175"
            value={lngStr}
            disabled={mode === "map"}
            onChange={(e) => setLngStr(e.target.value)}
          />
          <button
            className={`btn btn-small ${mode === "map" ? "btn-primary" : ""}`}
            onClick={pickOnMap}
          >
            {mode === "map" ? t("city.picking") : t("city.pickOnMap")}
          </button>
        </div>

        <label className="field-label">
          {t("city.defaultZoom")}: {Math.min(15, Math.max(10, Math.round(zoom)))}
        </label>
        <input
          type="range"
          min={10}
          max={15}
          step={1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
        />

        <div className="dialog-actions">
          <button className="btn btn-primary" onClick={() => void submit()} disabled={busy}>
            {t("city.create")}
          </button>
          <button className="btn" onClick={onClose}>
            {t("city.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
