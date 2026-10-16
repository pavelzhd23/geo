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
npm run tauri dev    # десктопный режим (SQLite: marks.db)
npm run tauri build  # сборка приложения (.deb/.AppImage в src-tauri/target/release/bundle/)
```

### Требования к Rust для сборки десктопа
`npm run tauri dev/build` компилируют `src-tauri`. Требуется **rustc >= 1.85**
(проверить: `rustc --version`). Crate-зависимости Tauri 2.12 используют
`edition = "2024"` и `resolver = "3"`, которые старый cargo не понимает
(ошибки вида `` `resolver` setting `3` is not valid `` /
`feature edition2024 is required`).

Установка/обновление Rust (официальный скрипт):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# ВНИМАНИЕ: ~/.cargo/env написан для bash/zsh. Если у вас fish
# («'case' builtin not inside of switch block»), вместо source "$HOME/.cargo/env"
# выполните один раз:
#   cargo env --shell fish >> ~/.config/fish/config.fish
# и перезапустите терминал.
rustup update stable
```

Tauri CLI брать НЕ нужно отдельно — он уже в dev-зависимостях npm
(`@tauri-apps/cli`), команды идут через `npm run tauri ...`.
`cargo install tauri-cli` не используйте.

Версии Rust-crate (`tauri =2.12.x`, `tauri-plugin-sql =2.6.x`) синхронизированы
с npm-пакетами (`@tauri-apps/api`, `@tauri-apps/plugin-sql`) — иначе CLI падает
с ошибкой «Found version mismatched Tauri packages». `Cargo.lock` в репозитории
фиксирует всё дерево зависимостей; если меняете версии — удалите его
(`rm src-tauri/Cargo.lock`) и пересоберите.

Для Linux также нужны системные зависимости WebKitGTK
(`libwebkit2gtk-4.1-dev`, `build-essential`, `libssl-dev` и т.д. — полный
список: https://tauri.app/start/prerequisites/).

## Проверка типов/сборки фронта
```bash
npx tsc --noEmit
npx vite build
```
