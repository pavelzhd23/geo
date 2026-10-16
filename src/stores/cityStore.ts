import { create } from "zustand";
import type { City, NewCity } from "../types";
import { db } from "../services/db";
import { clearOverpassCache } from "../services/overpass";

const LS_KEY = "mme.currentCityId";

interface CityState {
  cities: City[];
  currentCityId: number | null;
  loaded: boolean;
  /** координаты, выбранные кликом на карте для диалога создания города */
  pendingPick: boolean;
  loadCities: () => Promise<void>;
  setCurrentCity: (id: number) => void;
  createCity: (data: NewCity) => Promise<number>;
  deleteCity: (id: number) => Promise<void>;
  startPickOnMap: () => void;
  cancelPickOnMap: () => void;
}

export const useCityStore = create<CityState>((set, get) => ({
  cities: [],
  currentCityId: null,
  loaded: false,
  pendingPick: false,

  async loadCities() {
    const cities = await db.getCities();
    let current = get().currentCityId;
    // восстановление последнего выбранного города из localStorage
    if (current == null) {
      const stored = Number(window.localStorage.getItem(LS_KEY));
      if (stored && cities.some((c) => c.id === stored)) current = stored;
    }
    if (current == null && cities.length > 0) current = cities[0].id;
    set({ cities, currentCityId: current, loaded: true });
  },

  setCurrentCity(id) {
    if (get().currentCityId === id) return;
    window.localStorage.setItem(LS_KEY, String(id));
    clearOverpassCache(); // места другого города — нужен свежий запрос
    set({ currentCityId: id });
  },

  async createCity(data) {
    const id = await db.createCity(data);
    const cities = await db.getCities();
    set({ cities });
    return id;
  },

  async deleteCity(id) {
    await db.deleteCity(id);
    const cities = await db.getCities();
    let current = get().currentCityId;
    if (current === id) {
      current = cities.length ? cities[0].id : null;
      if (current != null) window.localStorage.setItem(LS_KEY, String(current));
      else window.localStorage.removeItem(LS_KEY);
      clearOverpassCache();
    }
    set({ cities, currentCityId: current });
  },

  startPickOnMap() {
    set({ pendingPick: true });
  },

  cancelPickOnMap() {
    set({ pendingPick: false });
  },
}));

/** Текущий город (или null, если ещё не выбран). */
export function getCurrentCity(): City | null {
  const { cities, currentCityId } = useCityStore.getState();
  return cities.find((c) => c.id === currentCityId) ?? null;
}
