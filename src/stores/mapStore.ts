import { create } from "zustand";
import type { Place } from "../types";

interface MapState {
  places: Place[];
  loading: boolean;
  selectedPlace: Place | null;
  setPlaces: (places: Place[]) => void;
  setLoading: (loading: boolean) => void;
  selectPlace: (place: Place | null) => void;
}

export const useMapStore = create<MapState>((set) => ({
  places: [],
  loading: false,
  selectedPlace: null,
  setPlaces: (places) => set({ places }),
  setLoading: (loading) => set({ loading }),
  selectPlace: (place) => set({ selectedPlace: place }),
}));
