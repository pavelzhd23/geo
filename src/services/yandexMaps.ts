import type { YMapsNamespace } from "../types";

/** API-ключ Яндекс Карт. Задайте в .env.local: VITE_YANDEX_MAPS_API_KEY */
const API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY as string | undefined;

/** Язык/регион карт по умолчанию. */
const DEFAULT_LOCALE = "ru_RU";

/**
 * URL JavaScript API 2.x Яндекс Карт.
 * Параметр `mode` (development / release / production) можно переопределить
 * через VITE_YANDEX_MAPS_MODE.
 */
function buildScriptSrc(): string {
  const mode = (import.meta.env.VITE_YANDEX_MAPS_MODE as string | undefined) ?? "release";
  return (
    `https://api-maps.yandex.ru/2.1/` +
    `?apikey=${encodeURIComponent(API_KEY ?? "")}` +
    `&lang=${DEFAULT_LOCALE.replace("_", "-")}` +
    `&mode=${mode}`
  );
}

let readyPromise: Promise<YMapsNamespace> | null = null;

export function hasYandexApiKey(): boolean {
  return Boolean(API_KEY);
}

/**
 * Однократно подключает скрипт Яндекс Карт и возвращает namespace `ymaps`
 * после события ready (промис кэшируется).
 */
export function getYMaps(): Promise<YMapsNamespace> {
  if (!API_KEY) {
    return Promise.reject(new Error("VITE_YANDEX_MAPS_API_KEY is not set"));
  }
  if (readyPromise) return readyPromise;

  readyPromise = new Promise<YMapsNamespace>((resolve, reject) => {
    // уже загружен ранее (например, при hot-reload)
    if (window.ymaps?.Map && typeof window.ymaps.ready === "function") {
      window.ymaps.ready(() => resolve(window.ymaps as YMapsNamespace));
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-yandex-maps]"
    );
    const script = existing ?? document.createElement("script");

    const onLoad = () => {
      const ymaps = window.ymaps;
      if (!ymaps || typeof ymaps.ready !== "function") {
        reject(new Error("ymaps namespace not found after script load"));
        return;
      }
      try {
        ymaps.ready(() => resolve(ymaps as YMapsNamespace));
      } catch (err) {
        reject(err);
      }
    };
    const onFail = () => {
      readyPromise = null;
      reject(new Error("Failed to load Yandex Maps script"));
    };

    script.addEventListener("load", onLoad);
    script.addEventListener("error", onFail);

    if (!existing) {
      script.src = buildScriptSrc();
      script.async = true;
      script.defer = true;
      script.setAttribute("data-yandex-maps", "");
      document.head.appendChild(script);
    } else if (window.ymaps) {
      onLoad();
    }
  });

  return readyPromise;
}
