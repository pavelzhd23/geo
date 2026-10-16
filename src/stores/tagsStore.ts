import { create } from "zustand";
import type { Tag } from "../types";
import { db } from "../services/db";

interface TagsState {
  tags: Tag[];
  loaded: boolean;
  load: () => Promise<void>;
  createTag: (name: string, parentId: number | null) => Promise<Tag | null>;
  renameTag: (id: number, name: string) => Promise<void>;
  deleteTag: (id: number) => Promise<void>;
}

export const useTagsStore = create<TagsState>((set, get) => ({
  tags: [],
  loaded: false,

  async load() {
    const tags = await db.getAllTags();
    set({ tags, loaded: true });
  },

  async createTag(name, parentId) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    try {
      const id = await db.createTag(trimmed, parentId);
      const tag: Tag = { id, name: trimmed, parent_id: parentId };
      set({ tags: [...get().tags, tag] });
      return tag;
    } catch {
      // UNIQUE(name, parent_id) — дубликат в пределах родителя
      await get().load();
      return null;
    }
  },

  async renameTag(id, name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await db.renameTag(id, trimmed);
    } finally {
      await get().load();
    }
  },

  async deleteTag(id) {
    await db.deleteTag(id);
    await get().load();
  },
}));
