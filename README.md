# Map Marker Editor

Десктопное приложение для разметки OSM-мест на карте города (Tauri 2 + React 18 + TS + Vite + Яндекс Карты (JS API 2.x) + Zustand + SQLite через @tauri-apps/plugin-sql, i18n — только русский).

## Возможности
- Карта — Яндекс Карты (JavaScript API 2.x, подключается скриптом `api-maps.yandex.ru/2.1`). POI подгружаются из Overpass API по видимому bbox (debounce 800 мс, кэш «bbox внутри предыдущего», лимит 500 маркеров с предупреждением).
- Маркеры — `ymaps.Placemark` с SVG-иконкой «цветной круг + emoji» по категории (без названия — серые); клик открывает карточку места.
- Карточка места: название, категория (перевод), координаты, сворачиваемый список OSM-тегов, «Мои теги» с кнопкой × и dropdown «Добавить тег» (дерево тегов + создание нового).
- Сайдбар: дерево тегов с вложенностью (создание корневых/дочерних, переименование по двойному клику, удаление через контекстное меню), фильтр по тегу рекурсивно (WITH RECURSIVE), сброс фильтра.
- Режим выделения: кнопка «Выделить» → клик по маркерам → «Создать тег из выделенных».
- Схема БД и миграции: `src-tauri/src/lib.rs`; на фронте — `src/services/db.ts` (вне Tauri работает in-memory fallback для отладки в браузере).

## Запуск
```bash
npm install
# Ключ API Яндекс Карт НЕ нужен: карта работает на бесплатном открытом доступе
# JavaScript API 2.1 (лимит ~50 000 запросов в сутки на IP — для личного инструмента за глаза).
# При желании можно указать собственный ключ (бесплатный тариф «Карточки и статическая карта»,
# https://developer.tech.yandex.ru/services/3) в .env.local: VITE_YANDEX_MAPS_API_KEY=...
npm run dev          # отладка в браузере (in-memory хранилище)
npm install -D @tauri-apps/cli@^2   # CLI через npm — не требует компиляции Rust
npm run tauri dev    # десктопный режим (SQLite: marks.db)
npm run tauri build  # сборка приложения
```

### Требования к Rust для сборки десктопа
`npm run tauri build` компилирует `src-tauri` и требует **rustc >= 1.85** (свежие
транзитивные crate-зависимости, например `cssparser-macros 0.7.x`, используют
Cargo `resolver = "3"`, который rustc 1.75 не понимает — ошибка
`` `resolver` setting `3` is not valid ``). Обновите Rust так:

```bash
rustup update stable            # или установите rustup: https://rustup.rs
cd src-tauri && rustup show     # проверит rust-toolchain.toml и подтянет stable
```

В `src-tauri/rust-toolchain.toml` зафиксирован канал `stable` — при наличии
rustup нужная версия выбирается автоматически. Если обновить Rust нельзя,
можно собрать приложение на более старой связке Tauri (например,
`cargo install tauri-cli --version "=2.2.5"` на rustc 1.75), но проще
обновить тулчейн. Также для Linux нужны системные зависимости WebKitGTK
(`libwebkit2gtk-4.1-dev`, `build-essential`, `libssl-dev` и т.д. — полный
список: https://tauri.app/start/prerequisites/).

## Проверка типов/сборки фронта
```bash
npx tsc --noEmit
npx vite build
```
