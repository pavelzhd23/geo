import { create } from "zustand";
import { db } from "../services/db";

interface FilterState {
  activeTagId: number | null;
  activeTagName: string | null;
  /** osm_id мест, подходящих под фильтр (включая потомков тега) */
  matchingIds: Set<string>;
  setFilter: (tagId: number, tagName: string) => Promise<void>;
  clear: () => void;
  refresh: () => Promise<void>;
}

export const useFilterStore = create<FilterState>((set, get) => ({
  activeTagId: null,
  activeTagName: null,
  matchingIds: new Set<string>(),

  async setFilter(tagId, tagName) {
    if (get().activeTagId === tagId) {
      get().clear();
      return;
    }
    const ids = await db.getPlacesForTagRecursive(tagId);
    set({ activeTagId: tagId, activeTagName: tagName, matchingIds: new Set(ids) });
  },

  clear() {
    set({ activeTagId: null, activeTagName: null, matchingIds: new Set<string>() });
  },

  async refresh() {
    const { activeTagId, activeTagName } = get();
    if (activeTagId == null || activeTagName == null) return;
    const ids = await db.getPlacesForTagRecursive(activeTagId);
    set({ matchingIds: new Set(ids) });
  },
}));
