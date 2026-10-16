import { create } from "zustand";
import type { Tag } from "../types";
import { db } from "../services/db";
import { useCityStore } from "./cityStore";

interface TagsState {
  tags: Tag[];
  loaded: boolean;
  load: (cityId?: number) => Promise<void>;
  createTag: (name: string, parentId: number | null, isAuto?: boolean) => Promise<Tag | null>;
  renameTag: (id: number, name: string) => Promise<void>;
  deleteTag: (id: number) => Promise<void>;
}

export const useTagsStore = create<TagsState>((set, get) => ({
  tags: [],
  loaded: false,

  async load(cityId) {
    const cid = cityId ?? useCityStore.getState().currentCityId;
    if (cid == null) {
      set({ tags: [], loaded: true });
      return;
    }
    const tags = await db.getAllTags(cid);
    set({ tags, loaded: true });
  },

  async createTag(name, parentId, isAuto = false) {
    const trimmed = name.trim();
    const cityId = useCityStore.getState().currentCityId;
    if (!trimmed || cityId == null) return null;
    try {
      const id = await db.createTag(cityId, trimmed, parentId, isAuto);
      const tag: Tag = { id, city_id: cityId, name: trimmed, parent_id: parentId, is_auto: isAuto ? 1 : 0 };
      set({ tags: [...get().tags, tag] });
      return tag;
    } catch {
      // UNIQUE(city_id, name, parent_id) — дубликат в пределах родителя
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
