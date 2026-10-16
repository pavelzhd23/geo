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
`npm run tauri build` компилирует `src-tauri`. Рекомендуется **rustc >= 1.85**:
свежие транзитивные crate-зависимости могут требовать Cargo `resolver = "3"`
и `edition = "2024"`, которые старый rustc не понимает (ошибки вида
`` `resolver` setting `3` is not valid `` / `feature edition2024 is required`).

**Вариант A (рекомендуется) — установить rustup через официальный скрипт:**

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# ВНИМАНИЕ: ~/.cargo/env написан для bash/zsh. Если у вас fish
# («'case' builtin not inside of switch block»), вместо source "$HOME/.cargo/env"
# выполните один раз:
#   cargo env --shell fish >> ~/.config/fish/config.fish
# и перезапустите терминал.
rustup update stable
```

После этого достаточно `npm run tauri build` (CLI берётся из dev-зависимости
`@tauri-apps/cli` через npm — отдельно ставить его через cargo не нужно).

**Вариант B — сборка на старом rustc (1.75+) без обновления Rust:**
в `src-tauri/Cargo.toml` зафиксированы версии tauri 2.2.x и пины
транзитивных зависимостей «до-edition2024» (включая `webkit2gtk =2.0.2`,
`tauri-build =2.0.5`). Удалите старый lock-файл и пересоберите:

```bash
rm -f src-tauri/Cargo.lock
npm run tauri build
```

Примечание: не ставьте `tauri-cli` через `cargo install` на старом rustc —
свежие версии CLI требуют rustc >= 1.90. Используйте CLI из npm
(`@tauri-apps/cli` в dev-зависимостях, вызывается через `npm run tauri …`).

Если появятся новые ошибки `edition2024` на других пакетах — самый надёжный
путь: получить `Cargo.lock`, собранный на rustc >= 1.85 (например, в Docker:
`docker run --rm -v $PWD/src-tauri:/app -w /app rust:1.85 cargo generate-lockfile`),
положить его в `src-tauri/` и закоммитить — тогда cargo всегда будет брать
совместимые версии.

Для Linux также нужны системные зависимости WebKitGTK
(`libwebkit2gtk-4.1-dev`, `build-essential`, `libssl-dev` и т.д. — полный
список: https://tauri.app/start/prerequisites/).

## Проверка типов/сборки фронта
```bash
npx tsc --noEmit
npx vite build
```
