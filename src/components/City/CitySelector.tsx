import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCityStore } from "../../stores/cityStore";
import CityCreateDialog from "./CityCreateDialog";

/** Селектор города в шапке приложения: dropdown + создание + удаление. */
export default function CitySelector() {
  const { t } = useTranslation();
  const cities = useCityStore((s) => s.cities);
  const currentCityId = useCityStore((s) => s.currentCityId);
  const setCurrentCity = useCityStore((s) => s.setCurrentCity);
  const deleteCity = useCityStore((s) => s.deleteCity);

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const current = cities.find((c) => c.id === currentCityId) ?? null;

  // закрытие dropdown по клику вне
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="city-selector" ref={rootRef}>
      <button className="city-selector-btn" onClick={() => setOpen((v) => !v)}>
        <span className="city-selector-icon">🏙️</span>
        <span className="city-selector-name">{current ? current.name : t("city.selector")}</span>
        <span className="city-selector-caret">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="city-dropdown">
          {cities.map((city) => (
            <div key={city.id} className="city-item-row">
              <button
                className={`city-item ${city.id === currentCityId ? "city-item-active" : ""}`}
                onClick={() => {
                  setCurrentCity(city.id);
                  setOpen(false);
                }}
              >
                {city.id === currentCityId ? "✓ " : ""}
                {city.name}
              </button>
              {cities.length > 1 && (
                <button
                  className="city-item-delete"
                  title={t("city.delete")}
                  onClick={() => {
                    if (window.confirm(t("city.deleteConfirm"))) {
                      void deleteCity(city.id);
                    }
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            className="city-item city-item-add"
            onClick={() => {
              setOpen(false);
              setCreating(true);
            }}
          >
            + {t("city.add")}
          </button>
        </div>
      )}

      {creating && <CityCreateDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
