import { create } from "zustand";
import type { Tag } from "../types";
import { db } from "../services/db";
import { useFilterStore } from "./filterStore";
import { useCityStore } from "./cityStore";

interface MarksState {
  /** osm_id -> теги, стоящие на месте */
  marksByPlace: Record<string, Tag[]>;
  /** множество osm_id помеченных мест (для быстрой подсветки маркеров) */
  markedIds: Set<string>;
  loadAll: (cityId?: number) => Promise<void>;
  getPlaceTags: (osmId: string) => Promise<Tag[]>;
  addMark: (osmId: string, tagId: number) => Promise<void>;
  removeMark: (osmId: string, tagId: number) => Promise<void>;
  addMarksBulk: (osmIds: string[], tagId: number) => Promise<void>;
}

export const useMarksStore = create<MarksState>((set, get) => ({
  marksByPlace: {},
  markedIds: new Set<string>(),

  async loadAll(cityId) {
    const cid = cityId ?? useCityStore.getState().currentCityId;
    if (cid == null) {
      set({ markedIds: new Set<string>(), marksByPlace: {} });
      return;
    }
    const all = await db.getAllMarks(cid);
    const ids = new Set<string>();
    for (const m of all) ids.add(m.osm_id);
    set({ markedIds: ids, marksByPlace: {} });
  },

  async getPlaceTags(osmId) {
    const cityId = useCityStore.getState().currentCityId;
    if (cityId == null) return [];
    const tags = await db.getTagsForPlace(osmId, cityId);
    set({
      marksByPlace: { ...get().marksByPlace, [osmId]: tags },
      markedIds: tags.length ? new Set(get().markedIds).add(osmId) : get().markedIds,
    });
    return tags;
  },

  async addMark(osmId, tagId) {
    const cityId = useCityStore.getState().currentCityId;
    if (cityId == null) return;
    await db.addMark(osmId, tagId, cityId);
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
    const cityId = useCityStore.getState().currentCityId;
    if (cityId == null) return;
    await db.addMarksBulk(osmIds, tagId, cityId);
    const markedIds = new Set(get().markedIds);
    for (const id of osmIds) markedIds.add(id);
    const marksByPlace = { ...get().marksByPlace };
    for (const id of osmIds) delete marksByPlace[id]; // сброс кэша карточки
    set({ markedIds, marksByPlace });
    await useFilterStore.getState().refresh();
  },
}));
