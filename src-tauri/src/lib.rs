use tauri_plugin_sql::{Migration, MigrationKind};

/// Миграции SQLite. Та же схема, что ожидает фронтенд (src/services/db.ts).
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
            version: 2,
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
