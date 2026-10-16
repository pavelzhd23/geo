import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Bbox } from "../types";
import { fetchPOIWithCache, clearOverpassCache, MAX_MARKERS } from "../services/overpass";
import { useMapStore } from "../stores/mapStore";
import { showToast } from "../utils/toast";

/** Загрузка POI по bbox с кэшем, лимитом маркеров и обработкой ошибок. */
export function useOverpass() {
  const { t } = useTranslation();
  const setPlaces = useMapStore((s) => s.setPlaces);
  const setLoading = useMapStore((s) => s.setLoading);
  const [truncated, setTruncated] = useState(false);
  /** запрос в полёте + последний успешно загруженный bbox (свой порядок!) */
  const inflight = useRef<{ promise: Promise<void> } | null>(null);
  const lastLoadedKey = useRef<string | null>(null);

  const load = useCallback(
    async (bbox: Bbox) => {
      // ждём завершения предыдущего запроса, чтобы не пересекать Overpass
      if (inflight.current) {
        await inflight.current.promise.catch(() => undefined);
      }
      let resolveDone: () => void;
      const handle = { promise: new Promise<void>((r) => (resolveDone = r)) };
      inflight.current = handle;
      setLoading(true);
      try {
        const res = await fetchPOIWithCache(bbox);
        // если за время запроса ушли далеко — результат всё равно полезен
        setPlaces(res.places);
        setTruncated(res.truncated);
        lastLoadedKey.current = JSON.stringify(bbox);
        if (res.truncated) {
          showToast(t("map.tooManyMarkers", { count: MAX_MARKERS }), "info");
        }
      } catch (err) {
        // ошибку не пробрасываем: карта продолжает работать
        showToast(t("error.loadPlaces"), "error");
        console.error("Overpass load failed:", err);
      } finally {
        setLoading(false);
        resolveDone!();
        if (inflight.current === handle) inflight.current = null;
      }
    },
    [setLoading, setPlaces, t]
  );

  /** Принудительная перезагрузка текущего bbox (при смене города). */
  const reload = useCallback(async () => {
    clearOverpassCache();
    lastLoadedKey.current = null;
    const bbox = useMapStore.getState().currentBbox;
    if (bbox) await load(bbox);
  }, [load]);

  return { load, reload, truncated };
}
