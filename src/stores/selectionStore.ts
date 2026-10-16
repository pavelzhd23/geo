import { create } from "zustand";

interface SelectionState {
  mode: boolean; // режим выделения включён
  selected: Set<string>; // osm_id выделенных мест
  enterMode: () => void;
  exitMode: () => void;
  toggle: (osmId: string) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  mode: false,
  selected: new Set<string>(),

  enterMode() {
    set({ mode: true, selected: new Set<string>() });
  },
  exitMode() {
    set({ mode: false, selected: new Set<string>() });
  },
  toggle(osmId) {
    const selected = new Set(get().selected);
    if (selected.has(osmId)) selected.delete(osmId);
    else selected.add(osmId);
    set({ selected });
  },
  clearSelection() {
    set({ selected: new Set<string>() });
  },
}));
