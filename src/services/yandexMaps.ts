import type { YMapsNamespace } from "../types";

/**
 * API-ключ Яндекс Карт (необязателен).
 * По умолчанию карта работает на бесплатном «открытом» доступе JavaScript API 2.1 —
 * без ключа, с суточным лимитом ~50 000 запросов на IP (достаточно для личного инструмента).
 * Если нужен собственный лимит/свой аккаунт — задайте ключ в .env.local:
 * VITE_YANDEX_MAPS_API_KEY (сервис «Карточки и статическая карта», бесплатного тарифа достаточно).
 */
const API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY as string | undefined;

/** Язык/регион карт по умолчанию. */
const DEFAULT_LOCALE = "ru_RU";

const READY_TIMEOUT_MS = 15000;

/** URL загрузки с альтернативным хостом (api-maps.yandex.ru блокируется в некоторых регионах). */
function buildScriptSrc(host: string): string {
  const mode = (import.meta.env.VITE_YANDEX_MAPS_MODE as string | undefined) ?? "release";
  const keyParam = API_KEY ? `&apikey=${encodeURIComponent(API_KEY)}` : "";
  return (
    `https://${host}/2.1/` +
    `?lang=${DEFAULT_LOCALE.replace("_", "-")}` +
    `${keyParam}` +
    `&mode=${mode}`
  );
}

const HOSTS = ["api-maps.yandex.ru", "api-maps-webcdn.yandex.net"];

let readyPromise: Promise<YMapsNamespace> | null = null;

/** Есть ли собственный ключ API (для informational-сообщений в UI). */
export function hasYandexApiKey(): boolean {
  return Boolean(API_KEY);
}

/** Подключает скрипт с указанного хоста; промис резолвится на событии load. */
function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.setAttribute("data-yandex-maps", "");
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => {
      script.remove();
      reject(new Error(`Failed to load ${src}`));
    });
    document.head.appendChild(script);
  });
}

/** Ждём появления window.ymaps и события ymaps.ready (с таймаутом). */
function waitForNamespace(): Promise<YMapsNamespace> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryReady = () => {
      const ymaps = window.ymaps;
      if (ymaps && typeof ymaps.ready === "function") {
        let done = false;
        try {
          ymaps.ready(() => {
            if (!done) {
              done = true;
              resolve(ymaps);
            }
          });
        } catch (err) {
          reject(err);
          return;
        }
      }
      if (Date.now() - start > READY_TIMEOUT_MS) {
        reject(new Error("Yandex Maps did not become ready in time"));
        return;
      }
      window.setTimeout(tryReady, 200);
    };
    tryReady();
  });
}

/**
 * Однократно подключает скрипт Яндекс Карт и возвращает namespace `ymaps`
 * после события ready (промис кэшируется). Ключ API не требуется —
 * используется бесплатный открытый доступ.
 * Пробует несколько хостов: api-maps.yandex.ru недоступен в ряде регионов,
 * но тот же API отдаётся с api-maps-webcdn.yandex.net.
 */
export function getYMaps(): Promise<YMapsNamespace> {
  if (readyPromise) return readyPromise;

  readyPromise = (async () => {
    // уже загружен ранее (например, при hot-reload)
    if (window.ymaps?.Map && typeof window.ymaps.ready === "function") {
      return waitForNamespace();
    }

    let lastError: unknown = null;
    for (const host of HOSTS) {
      try {
        await injectScript(buildScriptSrc(host));
        return await waitForNamespace();
      } catch (err) {
        lastError = err;
        console.warn(`[yandexMaps] host ${host} failed, trying next`, err);
      }
    }
    throw lastError ?? new Error("Failed to load Yandex Maps script");
  })().catch((err) => {
    // позвольем повторную попытку после перезагрузки страницы/ошибки
    readyPromise = null;
    throw err;
  });

  return readyPromise;
}
