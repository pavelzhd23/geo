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

# 1. Получите ключ JavaScript API на https://developer.tech.yandex.ru/services/3
# 2. Создайте .env.local (скопировав .env.example) и впишите:
#    VITE_YANDEX_MAPS_API_KEY=ваш_ключ
npm run dev          # отладка в браузере (in-memory хранилище)
cargo install tauri-cli --locked   # один раз (нужен Rust)
npm run tauri dev    # десктопный режим (SQLite: marks.db)
npm run tauri build  # сборка приложения
```

## Проверка типов/сборки фронта
```bash
npx tsc --noEmit
npx vite build
```
