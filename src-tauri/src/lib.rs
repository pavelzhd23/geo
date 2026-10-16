use tauri_plugin_sql::{Migration, MigrationKind};

/// Миграции SQLite. Та же схема, что ожидает фронтенд (src/services/db.ts).
/// v1 — базовая схема (tags/marks); v2 — города (мультигородность, пересоздание
/// таблиц с city_id NOT NULL); v3 — флаг is_auto для автокластеров.
pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_tags",
            sql: "CREATE TABLE IF NOT EXISTS tags (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    parent_id INTEGER,
                    FOREIGN KEY (parent_id) REFERENCES tags(id) ON DELETE SET NULL,
                    UNIQUE (name, parent_id)
                  );
                  CREATE INDEX IF NOT EXISTS idx_tags_parent ON tags(parent_id);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 1,
            description: "create_marks",
            sql: "CREATE TABLE IF NOT EXISTS marks (
                    osm_id TEXT NOT NULL,
                    tag_id INTEGER NOT NULL,
                    PRIMARY KEY (osm_id, tag_id),
                    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
                  );
                  CREATE INDEX IF NOT EXISTS idx_marks_osm ON marks(osm_id);
                  CREATE INDEX IF NOT EXISTS idx_marks_tag ON marks(tag_id);",
            kind: MigrationKind::Up,
        },
        // Миграция v2: города. SQLite не умеет добавлять NOT NULL колонку через
        // ALTER TABLE, поэтому таблицы пересоздаются с сохранением данных.
        Migration {
            version: 2,
            description: "cities_multicity",
            sql: "PRAGMA foreign_keys = OFF;

                  CREATE TABLE cities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    center_lat REAL NOT NULL,
                    center_lng REAL NOT NULL,
                    default_zoom INTEGER NOT NULL DEFAULT 12,
                    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
                  );

                  CREATE TABLE tags_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    city_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    parent_id INTEGER,
                    FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE,
                    FOREIGN KEY (parent_id) REFERENCES tags_new(id) ON DELETE SET NULL,
                    UNIQUE (city_id, name, parent_id)
                  );

                  CREATE TABLE marks_new (
                    osm_id TEXT NOT NULL,
                    tag_id INTEGER NOT NULL,
                    city_id INTEGER NOT NULL,
                    PRIMARY KEY (osm_id, tag_id),
                    FOREIGN KEY (tag_id) REFERENCES tags_new(id) ON DELETE CASCADE,
                    FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
                  );

                  INSERT INTO cities (name, center_lat, center_lng) VALUES ('Первый город', 0, 0);

                  INSERT INTO tags_new (id, city_id, name, parent_id)
                    SELECT id, 1, name, parent_id FROM tags;

                  INSERT INTO marks_new (osm_id, tag_id, city_id)
                    SELECT m.osm_id, m.tag_id, 1
                    FROM marks m
                    JOIN tags_new t ON t.id = m.tag_id;

                  DROP TABLE marks;
                  DROP TABLE tags;
                  ALTER TABLE tags_new RENAME TO tags;
                  ALTER TABLE marks_new RENAME TO marks;

                  CREATE INDEX IF NOT EXISTS idx_tags_city ON tags(city_id);
                  CREATE INDEX IF NOT EXISTS idx_tags_parent ON tags(parent_id);
                  CREATE INDEX IF NOT EXISTS idx_marks_city ON marks(city_id);
                  CREATE INDEX IF NOT EXISTS idx_marks_osm ON marks(osm_id);
                  CREATE INDEX IF NOT EXISTS idx_marks_tag ON marks(tag_id);

                  PRAGMA foreign_keys = ON;",
            kind: MigrationKind::Up,
        },
        // Миграция v3: пометка «тег создан автокластеризацией».
        Migration {
            version: 3,
            description: "tags_is_auto",
            sql: "ALTER TABLE tags ADD COLUMN is_auto INTEGER NOT NULL DEFAULT 0;
                  CREATE INDEX IF NOT EXISTS idx_tags_auto ON tags(is_auto);",
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:marks.db", get_migrations())
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
