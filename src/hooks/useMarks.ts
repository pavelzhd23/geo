import { useEffect } from "react";
import { useMarksStore } from "../stores/marksStore";
import { useCityStore } from "../stores/cityStore";

/** Работа с пометками: отметки мест, добавление/снятие, массовые операции. */
export function useMarks() {
  const markedIds = useMarksStore((s) => s.markedIds);
  const marksByPlace = useMarksStore((s) => s.marksByPlace);
  const loadAll = useMarksStore((s) => s.loadAll);
  const getPlaceTags = useMarksStore((s) => s.getPlaceTags);
  const addMark = useMarksStore((s) => s.addMark);
  const removeMark = useMarksStore((s) => s.removeMark);
  const addMarksBulk = useMarksStore((s) => s.addMarksBulk);
  const cityId = useCityStore((s) => s.currentCityId);

  // Пометки перезагружаются при старте и при смене города
  useEffect(() => {
    if (cityId != null) void loadAll(cityId);
  }, [cityId, loadAll]);

  return { markedIds, marksByPlace, getPlaceTags, addMark, removeMark, addMarksBulk };
}
