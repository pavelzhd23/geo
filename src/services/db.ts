import Database from "@tauri-apps/plugin-sql";
import type { Tag } from "../types";

/**
 * Обёртка над @tauri-apps/plugin-sql.
 * Внутри Tauri используется SQLite-файл marks.db; вне Tauri (браузерная
 * отладка через `vite`) — in-memory fallback, чтобы UI оставался рабочим.
 */

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
];

const RECURSIVE_DESCENDANTS_SQL = `
WITH RECURSIVE descendants(id) AS (
  SELECT id FROM tags WHERE id = ?1
  UNION ALL
  SELECT t.id FROM tags t JOIN descendants d ON t.parent_id = d.id
)
SELECT DISTINCT osm_id FROM marks WHERE tag_id IN (SELECT id FROM descendants)`;

let dbPromise: Promise<Database> | null = null;

async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await Database.load("sqlite:marks.db");
      for (const sql of MIGRATIONS) await db.execute(sql);
      return db;
    })();
    dbPromise.catch(() => (dbPromise = null));
  }
  return dbPromise;
}

/* ---------- In-memory fallback (только для разработки в браузере) ---------- */

interface MemTag extends Tag {}
interface MemMark {
  osm_id: string;
  tag_id: number;
}

const mem = {
  tags: [] as MemTag[],
  marks: [] as MemMark[],
  nextId: 1,
};

function memDescendants(tagId: number): Set<number> {
  const result = new Set<number>([tagId]);
  const stack = [tagId];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const t of mem.tags) {
      if (t.parent_id === cur && !result.has(t.id)) {
        result.add(t.id);
        stack.push(t.id);
      }
    }
  }
  return result;
}

const isTauri = typeof (window as any).__TAURI_INTERNALS__ !== "undefined";

/* ---------------------------------- API ---------------------------------- */

export const db = {
  // Теги
  async getAllTags(): Promise<Tag[]> {
    if (isTauri) {
      const conn = await getDb();
      return conn.select<Tag[]>("SELECT id, name, parent_id FROM tags ORDER BY name");
    }
    return [...mem.tags].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  },

  async createTag(name: string, parentId: number | null): Promise<number> {
    if (isTauri) {
      const conn = await getDb();
      const res = await conn.execute(
        "INSERT INTO tags (name, parent_id) VALUES (?1, ?2)",
        [name, parentId]
      );
      return Number(res.lastInsertId ?? 0);
    }
    const id = mem.nextId++;
    mem.tags.push({ id, name, parent_id: parentId });
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

  // Пометки
  async getTagsForPlace(osmId: string): Promise<Tag[]> {
    if (isTauri) {
      const conn = await getDb();
      return conn.select<Tag[]>(
        `SELECT t.id, t.name, t.parent_id FROM tags t
         JOIN marks m ON m.tag_id = t.id
         WHERE m.osm_id = ?1 ORDER BY t.name`,
        [osmId]
      );
    }
    const ids = new Set(mem.marks.filter((m) => m.osm_id === osmId).map((m) => m.tag_id));
    return mem.tags.filter((t) => ids.has(t.id)).sort((a, b) => a.name.localeCompare(b.name, "ru"));
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
    return [...new Set(mem.marks.filter((m) => m.tag_id === tagId).map((m) => m.osm_id))];
  },

  async getPlacesForTagRecursive(tagId: number): Promise<string[]> {
    if (isTauri) {
      const conn = await getDb();
      const rows = await conn.select<{ osm_id: string }[]>(RECURSIVE_DESCENDANTS_SQL, [tagId]);
      return rows.map((r) => r.osm_id);
    }
    const desc = memDescendants(tagId);
    return [...new Set(mem.marks.filter((m) => desc.has(m.tag_id)).map((m) => m.osm_id))];
  },

  /** Все пометки разом (для подсветки маркеров при загрузке). */
  async getAllMarks(): Promise<{ osm_id: string; tag_id: number }[]> {
    if (isTauri) {
      const conn = await getDb();
      return conn.select<{ osm_id: string; tag_id: number }[]>("SELECT osm_id, tag_id FROM marks");
    }
    return [...mem.marks];
  },

  async addMark(osmId: string, tagId: number): Promise<void> {
    if (isTauri) {
      const conn = await getDb();
      await conn.execute(
        "INSERT OR IGNORE INTO marks (osm_id, tag_id) VALUES (?1, ?2)",
        [osmId, tagId]
      );
      return;
    }
    if (!mem.marks.some((m) => m.osm_id === osmId && m.tag_id === tagId)) {
      mem.marks.push({ osm_id: osmId, tag_id: tagId });
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
  async addMarksBulk(osmIds: string[], tagId: number): Promise<void> {
    if (isTauri) {
      const conn = await getDb();
      for (const osmId of osmIds) {
        await conn.execute(
          "INSERT OR IGNORE INTO marks (osm_id, tag_id) VALUES (?1, ?2)",
          [osmId, tagId]
        );
      }
      return;
    }
    for (const osmId of osmIds) {
      if (!mem.marks.some((m) => m.osm_id === osmId && m.tag_id === tagId)) {
        mem.marks.push({ osm_id: osmId, tag_id: tagId });
      }
    }
  },
};
