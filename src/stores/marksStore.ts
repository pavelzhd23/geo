import { create } from "zustand";
import type { Tag } from "../types";
import { db } from "../services/db";
import { useFilterStore } from "./filterStore";

interface MarksState {
  /** osm_id -> теги, стоящие на месте */
  marksByPlace: Record<string, Tag[]>;
  /** множество osm_id помеченных мест (для быстрой подсветки маркеров) */
  markedIds: Set<string>;
  loadAll: () => Promise<void>;
  getPlaceTags: (osmId: string) => Promise<Tag[]>;
  addMark: (osmId: string, tagId: number) => Promise<void>;
  removeMark: (osmId: string, tagId: number) => Promise<void>;
  addMarksBulk: (osmIds: string[], tagId: number) => Promise<void>;
}

export const useMarksStore = create<MarksState>((set, get) => ({
  marksByPlace: {},
  markedIds: new Set<string>(),

  async loadAll() {
    const all = await db.getAllMarks();
    const ids = new Set<string>();
    for (const m of all) ids.add(m.osm_id);
    set({ markedIds: ids });
  },

  async getPlaceTags(osmId) {
    const tags = await db.getTagsForPlace(osmId);
    set({
      marksByPlace: { ...get().marksByPlace, [osmId]: tags },
      markedIds: tags.length ? new Set(get().markedIds).add(osmId) : get().markedIds,
    });
    return tags;
  },

  async addMark(osmId, tagId) {
    await db.addMark(osmId, tagId);
    await get().getPlaceTags(osmId);
    // После изменения пометок пересчитываем список мест активного фильтра.
    await useFilterStore.getState().refresh();
  },

  async removeMark(osmId, tagId) {
    await db.removeMark(osmId, tagId);
    await get().getPlaceTags(osmId);
    await useFilterStore.getState().refresh();
  },

  async addMarksBulk(osmIds, tagId) {
    await db.addMarksBulk(osmIds, tagId);
    const markedIds = new Set(get().markedIds);
    for (const id of osmIds) markedIds.add(id);
    const marksByPlace = { ...get().marksByPlace };
    for (const id of osmIds) delete marksByPlace[id]; // сброс кэша карточки
    set({ markedIds, marksByPlace });
    await useFilterStore.getState().refresh();
  },
}));
