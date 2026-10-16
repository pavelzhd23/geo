import Database from "@tauri-apps/plugin-sql";
import type { City, NewCity, Tag } from "../types";

/**
 * Обёртка над @tauri-apps/plugin-sql.
 * Внутри Tauri используется SQLite-файл marks.db (миграции — src-tauri/src/lib.rs);
 * вне Tauri (браузерная отладка через `vite`) — in-memory fallback со своей
 * упрощённой реализацией той же схемы (cities / tags / marks), чтобы UI оставался рабочим.
 *
 * Мультигородность: все теги и пометки привязаны к city_id текущего города.
 */

/* --------------------------- Миграции (браузерный режим) --------------------------- */

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER,
    FOREIGN KEY (parent_id) REFERENCES tags(id) ON DELETE SET NULL,
    UNIQUE (name, parent_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tags_parent ON tags(parent_id)`,
  `CREATE TABLE IF NOT EXISTS marks (
    osm_id TEXT NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (osm_id, tag_id),
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_marks_osm ON marks(osm_id)`,
  `CREATE INDEX IF NOT EXISTS idx_marks_tag ON marks(tag_id)`,
  // --- v2: города (пересоздание таблиц с city_id NOT NULL) ---
  `CREATE TABLE IF NOT EXISTS cities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    center_lat REAL NOT NULL,
    center_lng REAL NOT NULL,
    default_zoom INTEGER NOT NULL DEFAULT 12,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  )`,
  `CREATE TABLE IF NOT EXISTS tags_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    parent_id INTEGER,
    FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES tags_new(id) ON DELETE SET NULL,
    UNIQUE (city_id, name, parent_id)
  )`,
  `CREATE TABLE IF NOT EXISTS marks_new (
    osm_id TEXT NOT NULL,
    tag_id INTEGER NOT NULL,
    city_id INTEGER NOT NULL,
    PRIMARY KEY (osm_id, tag_id),
    FOREIGN KEY (tag_id) REFERENCES tags_new(id) ON DELETE CASCADE,
    FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
  )`,
  `INSERT INTO cities (name, center_lat, center_lng)
   SELECT 'Первый город', 0, 0 WHERE NOT EXISTS (SELECT 1 FROM cities)`,
  `INSERT INTO tags_new (id, city_id, name, parent_id)
   SELECT id, 1, name, parent_id FROM tags`,
  `INSERT INTO marks_new (osm_id, tag_id, city_id)
   SELECT m.osm_id, m.tag_id, 1 FROM marks m JOIN tags_new t ON t.id = m.tag_id`,
  `DROP TABLE marks`,
  `DROP TABLE tags`,
  `ALTER TABLE tags_new RENAME TO tags`,
  `ALTER TABLE marks_new RENAME TO marks`,
  `CREATE INDEX IF NOT EXISTS idx_tags_city ON tags(city_id)`,
  `CREATE INDEX IF NOT EXISTS idx_marks_city ON marks(city_id)`,
  // --- v3: флаг автокластеров ---
  `ALTER TABLE tags ADD COLUMN is_auto INTEGER NOT NULL DEFAULT 0`,
  `CREATE INDEX IF NOT EXISTS idx_tags_auto ON tags(is_auto)`,
];

/** Рекурсивный запрос мест тега (включая потомков), ограниченный городом. */
const RECURSIVE_DESCENDANTS_SQL = `
WITH RECURSIVE descendants(id) AS (
  SELECT id FROM tags WHERE id = ?1 AND city_id = ?2
  UNION ALL
  SELECT t.id FROM tags t
  JOIN descendants d ON t.parent_id = d.id
  WHERE t.city_id = ?2
)
SELECT DISTINCT osm_id FROM marks
WHERE tag_id IN (SELECT id FROM descendants) AND city_id = ?2`;

let dbPromise: Promise<Database> | null = null;

async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await Database.load("sqlite:marks.db");
      // Миграции выполняет плагин tauri-plugin-sql (src-tauri/src/lib.rs).
      // Здесь — страховка для старых БД, созданных без плагина: каждый шаг
      // идемпотентен или безопасно игнорируется при повторе.
      for (const sql of MIGRATIONS) {
        try {
          await db.execute(sql);
        } catch {
          /* таблица/колонка уже существует — ок */
        }
      }
      return db;
    })();
    dbPromise.catch(() => (dbPromise = null));
  }
  return dbPromise;
}

/* ---------- In-memory fallback (только для разработки в браузере) ---------- */

interface MemMark {
  osm_id: string;
  tag_id: number;
  city_id: number;
}

const mem = {
  cities: [] as City[],
  nextCityId: 1,
  tags: [] as Tag[],
  marks: [] as MemMark[],
  nextTagId: 1,
};

// Город по умолчанию при первом запуске в браузере
mem.cities.push({
  id: 1,
  name: "Первый город",
  center_lat: 55.752,
  center_lng: 37.6175,
  default_zoom: 13,
});
mem.nextCityId = 2;

function memDescendants(tagId: number, cityId: number): Set<number> {
  const result = new Set<number>([tagId]);
  const stack = [tagId];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const t of mem.tags) {
      if (t.city_id === cityId && t.parent_id === cur && !result.has(t.id)) {
        result.add(t.id);
        stack.push(t.id);
      }
    }
  }
  return result;
}

const isTauri = typeof (window as any).__TAURI_INTERNALS__ !== "undefined";

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "ru");

/* ---------------------------------- API ---------------------------------- */

export const db = {
  // Города
  async getCities(): Promise<City[]> {
    if (isTauri) {
      const conn = await getDb();
      return conn.select<City[]>(
        "SELECT id, name, center_lat, center_lng, default_zoom FROM cities ORDER BY name"
      );
    }
    return [...mem.cities].sort(byName);
  },

  async createCity(data: NewCity): Promise<number> {
    if (isTauri) {
      const conn = await getDb();
      const res = await conn.execute(
        "INSERT INTO cities (name, center_lat, center_lng, default_zoom) VALUES (?1, ?2, ?3, ?4)",
        [data.name, data.center_lat, data.center_lng, data.default_zoom]
      );
      return Number(res.lastInsertId ?? 0);
    }
    const id = mem.nextCityId++;
    mem.cities.push({ id, ...data });
    return id;
  },

  async deleteCity(id: number): Promise<void> {
    if (isTauri) {
      const conn = await getDb();
      // теги и пометки удаляются каскадно (FK ON DELETE CASCADE)
      await conn.execute("DELETE FROM cities WHERE id = ?1", [id]);
      return;
    }
    mem.cities = mem.cities.filter((c) => c.id !== id);
    const deletedTags = new Set(mem.tags.filter((t) => t.city_id === id).map((t) => t.id));
    mem.tags = mem.tags.filter((t) => t.city_id !== id);
    mem.marks = mem.marks.filter((m) => m.city_id !== id && !deletedTags.has(m.tag_id));
  },

  // Теги (в пределах города)
  async getAllTags(cityId: number): Promise<Tag[]> {
    if (isTauri) {
      const conn = await getDb();
      return conn.select<Tag[]>(
        "SELECT id, city_id, name, parent_id, is_auto FROM tags WHERE city_id = ?1 ORDER BY name",
        [cityId]
      );
    }
    return mem.tags.filter((t) => t.city_id === cityId).sort(byName);
  },

  async createTag(
    cityId: number,
    name: string,
    parentId: number | null,
    isAuto = false
  ): Promise<number> {
    if (isTauri) {
      const conn = await getDb();
      const res = await conn.execute(
        "INSERT INTO tags (city_id, name, parent_id, is_auto) VALUES (?1, ?2, ?3, ?4)",
        [cityId, name, parentId, isAuto ? 1 : 0]
      );
      return Number(res.lastInsertId ?? 0);
    }
    const id = mem.nextTagId++;
    mem.tags.push({ id, city_id: cityId, name, parent_id: parentId, is_auto: isAuto ? 1 : 0 });
    return id;
  },

  async renameTag(id: number, name: string): Promise<void> {
    if (isTauri) {
      const conn = await getDb();
      await conn.execute("UPDATE tags SET name = ?1 WHERE id = ?2", [name, id]);
      return;
    }
    const t = mem.tags.find((x) => x.id === id);
    if (t) t.name = name;
  },

  async deleteTag(id: number): Promise<void> {
    if (isTauri) {
      const conn = await getDb();
      // marks удаляются каскадно (FK ON DELETE CASCADE),
      // дети «всплывают» наверх (FK ON DELETE SET NULL)
      await conn.execute("DELETE FROM tags WHERE id = ?1", [id]);
      return;
    }
    mem.marks = mem.marks.filter((m) => m.tag_id !== id);
    for (const t of mem.tags) if (t.parent_id === id) t.parent_id = null;
    mem.tags = mem.tags.filter((t) => t.id !== id);
  },

  /** Удаление всех автокластеров города (их пометки уходят каскадно). */
  async deleteAutoTags(cityId: number): Promise<void> {
    if (isTauri) {
      const conn = await getDb();
      await conn.execute("DELETE FROM tags WHERE city_id = ?1 AND is_auto = 1", [cityId]);
      return;
    }
    const autoIds = new Set(
      mem.tags.filter((t) => t.city_id === cityId && t.is_auto === 1).map((t) => t.id)
    );
    mem.tags = mem.tags.filter((t) => !autoIds.has(t.id));
    mem.marks = mem.marks.filter((m) => !autoIds.has(m.tag_id));
  },

  // Пометки
  async getTagsForPlace(osmId: string, cityId: number): Promise<Tag[]> {
    if (isTauri) {
      const conn = await getDb();
      return conn.select<Tag[]>(
        `SELECT t.id, t.city_id, t.name, t.parent_id, t.is_auto FROM tags t
         JOIN marks m ON m.tag_id = t.id
         WHERE m.osm_id = ?1 AND m.city_id = ?2 ORDER BY t.name`,
        [osmId, cityId]
      );
    }
    const ids = new Set(
      mem.marks.filter((m) => m.osm_id === osmId && m.city_id === cityId).map((m) => m.tag_id)
    );
    return mem.tags.filter((t) => ids.has(t.id)).sort(byName);
  },

  async getPlacesForTag(tagId: number): Promise<string[]> {
    if (isTauri) {
      const conn = await getDb();
      const rows = await conn.select<{ osm_id: string }[]>(
        "SELECT DISTINCT osm_id FROM marks WHERE tag_id = ?1",
        [tagId]
      );
      return rows.map((r) => r.osm_id);
    }
    return [
      ...new Set(mem.marks.filter((m) => m.tag_id === tagId).map((m) => m.osm_id)),
    ];
  },

  /** Места тега и всех его потомков в пределах города. */
  async getPlacesForTagRecursive(tagId: number, cityId: number): Promise<string[]> {
    if (isTauri) {
      const conn = await getDb();
      const rows = await conn.select<{ osm_id: string }[]>(RECURSIVE_DESCENDANTS_SQL, [
        tagId,
        cityId,
      ]);
      return rows.map((r) => r.osm_id);
    }
    const desc = memDescendants(tagId, cityId);
    return [
      ...new Set(
        mem.marks.filter((m) => m.city_id === cityId && desc.has(m.tag_id)).map((m) => m.osm_id)
      ),
    ];
  },

  /** Все пометки города разом (для подсветки маркеров при загрузке). */
  async getAllMarks(cityId: number): Promise<{ osm_id: string; tag_id: number }[]> {
    if (isTauri) {
      const conn = await getDb();
      return conn.select<{ osm_id: string; tag_id: number }[]>(
        "SELECT osm_id, tag_id FROM marks WHERE city_id = ?1",
        [cityId]
      );
    }
    return mem.marks
      .filter((m) => m.city_id === cityId)
      .map(({ osm_id, tag_id }) => ({ osm_id, tag_id }));
  },

  async addMark(osmId: string, tagId: number, cityId: number): Promise<void> {
    if (isTauri) {
      const conn = await getDb();
      await conn.execute(
        "INSERT OR IGNORE INTO marks (osm_id, tag_id, city_id) VALUES (?1, ?2, ?3)",
        [osmId, tagId, cityId]
      );
      return;
    }
    if (!mem.marks.some((m) => m.osm_id === osmId && m.tag_id === tagId)) {
      mem.marks.push({ osm_id: osmId, tag_id: tagId, city_id: cityId });
    }
  },

  async removeMark(osmId: string, tagId: number): Promise<void> {
    if (isTauri) {
      const conn = await getDb();
      await conn.execute("DELETE FROM marks WHERE osm_id = ?1 AND tag_id = ?2", [osmId, tagId]);
      return;
    }
    mem.marks = mem.marks.filter((m) => !(m.osm_id === osmId && m.tag_id === tagId));
  },

  // Массовые операции
  async addMarksBulk(osmIds: string[], tagId: number, cityId: number): Promise<void> {
    if (isTauri) {
      const conn = await getDb();
      for (const osmId of osmIds) {
        await conn.execute(
          "INSERT OR IGNORE INTO marks (osm_id, tag_id, city_id) VALUES (?1, ?2, ?3)",
          [osmId, tagId, cityId]
        );
      }
      return;
    }
    for (const osmId of osmIds) {
      if (!mem.marks.some((m) => m.osm_id === osmId && m.tag_id === tagId)) {
        mem.marks.push({ osm_id: osmId, tag_id: tagId, city_id: cityId });
      }
    }
  },
};
