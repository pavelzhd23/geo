import { create } from "zustand";
import type { Bbox, Place } from "../types";

interface MapState {
  places: Place[];
  loading: boolean;
  selectedPlace: Place | null;
  /** текущий видимый bbox (для режима «только видимое» в автокластеризации) */
  currentBbox: Bbox | null;
  setPlaces: (places: Place[]) => void;
  setLoading: (loading: boolean) => void;
  selectPlace: (place: Place | null) => void;
  setCurrentBbox: (bbox: Bbox) => void;
}

export const useMapStore = create<MapState>((set) => ({
  places: [],
  loading: false,
  selectedPlace: null,
  currentBbox: null,
  setPlaces: (places) => set({ places }),
  setLoading: (loading) => set({ loading }),
  selectPlace: (place) => set({ selectedPlace: place }),
  setCurrentBbox: (bbox) => set({ currentBbox: bbox }),
}));
