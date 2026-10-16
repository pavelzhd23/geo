import { create } from "zustand";
import type { Place } from "../types";
import { db } from "../services/db";
import { clusterPlaces, type ClusterResult } from "../services/autocluster";
import { useCityStore } from "./cityStore";
import { useTagsStore } from "./tagsStore";
import { useMarksStore } from "./marksStore";
import { useFilterStore } from "./filterStore";

export type AutoclusterScope = "all" | "visible";

export interface AutoclusterParams {
  /** радиус DBSCAN, метры */
  eps: number;
  minPts: number;
  autoEps: boolean;
  scope: AutoclusterScope;
  includeNoise: boolean;
  removeExisting: boolean;
}

export interface PreviewInfo {
  clusters: number;
  places: number;
  noise: number;
}

interface ClusterItem {
  name: string;
  osmIds: string[];
}

interface AutoclusterState {
  isOpen: boolean;
  params: AutoclusterParams;
  preview: PreviewInfo | null;
  /** true — если точек больше 500 и кластеризация идёт с прогрессом */
  running: boolean;
  progress: number;
  /** результат после «Кластеризовать» (до сохранения): список для переименования */
  result: ClusterItem[] | null;
  open: () => void;
  close: () => void;
  setParams: (p: Partial<AutoclusterParams>) => void;
  computePreview: (places: Place[]) => void;
  run: (places: Place[]) => Promise<void>;
  renameCluster: (index: number, name: string) => void;
  save: () => Promise<void>;
}

const DEFAULT_PARAMS: AutoclusterParams = {
  eps: 300,
  minPts: 3,
  autoEps: false,
  scope: "visible",
  includeNoise: false,
  removeExisting: true,
};

/** Синхронный запуск кластеризации с уступкой потока (для больших наборов). */
function clusterize(places: Place[], params: AutoclusterParams): ClusterResult {
  return clusterPlaces(places, { eps: params.eps, minPts: params.minPts, autoEps: params.autoEps });
}

export const useAutoclusterStore = create<AutoclusterState>((set, get) => ({
  isOpen: false,
  params: DEFAULT_PARAMS,
  preview: null,
  running: false,
  progress: 0,
  result: null,

  open() {
    set({ isOpen: true, result: null, running: false, progress: 0 });
  },

  close() {
    set({ isOpen: false, result: null, running: false, progress: 0 });
  },

  setParams(p) {
    set({ params: { ...get().params, ...p }, result: null });
  },

  computePreview(places) {
    const params = get().params;
    if (places.length === 0) {
      set({ preview: null });
      return;
    }
    try {
      const res = clusterize(places, params);
      const inClusters = res.clusters.reduce((s, c) => s + c.length, 0);
      set({
        preview: { clusters: res.clusters.length, places: inClusters, noise: res.noise.length },
      });
    } catch {
      set({ preview: null });
    }
  },

  async run(places) {
    const params = get().params;
    if (places.length === 0 || get().running) return;
    set({ running: true, progress: 0, result: null });
    try {
      // для больших наборов показываем прогресс и уступаем поток перед запуском
      if (places.length > 500) {
        await new Promise((r) => setTimeout(r, 0));
        set({ progress: 0.3 });
      }
      const res = clusterize(places, params);
      set({ progress: 0.9 });

      // Имена-черновики; локализованные названия («Кластер N», «Без кластера»)
      // подставляет компонент до сохранения (см. ClusterList).
      const items: ClusterItem[] = res.clusters.map((c, i) => ({
        name: `📍 #${i + 1}`,
        osmIds: c.map((idx) => places[idx].osm_id),
      }));

      if (params.includeNoise && res.noise.length > 0) {
        items.push({
          name: "📍 *",
          osmIds: res.noise.map((idx) => places[idx].osm_id),
        });
      }
      set({ result: items, progress: 1 });
    } finally {
      set({ running: false });
    }
  },

  renameCluster(index, name) {
    const result = get().result;
    if (!result) return;
    const next = [...result];
    next[index] = { ...next[index], name };
    set({ result: next });
  },

  async save() {
    const { result, params } = get();
    const cityId = useCityStore.getState().currentCityId;
    if (!result || cityId == null) return;

    if (params.removeExisting) {
      await db.deleteAutoTags(cityId);
      await useTagsStore.getState().load(cityId);
      await useMarksStore.getState().loadAll(cityId);
      await useFilterStore.getState().clear();
    }

    for (const item of result) {
      const trimmed = item.name.trim();
      if (!trimmed) continue;
      const tagId = await db.createTag(cityId, trimmed, null, true);
      await db.addMarksBulk(item.osmIds, tagId, cityId);
    }

    await useTagsStore.getState().load(cityId);
    await useMarksStore.getState().loadAll(cityId);
    await useFilterStore.getState().refresh();
    set({ isOpen: false, result: null, preview: null });
  },
}));
