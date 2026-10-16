import { useEffect } from "react";
import { useMarksStore } from "../stores/marksStore";

/** Работа с пометками: отметки мест, добавление/снятие, массовые операции. */
export function useMarks() {
  const markedIds = useMarksStore((s) => s.markedIds);
  const marksByPlace = useMarksStore((s) => s.marksByPlace);
  const loadAll = useMarksStore((s) => s.loadAll);
  const getPlaceTags = useMarksStore((s) => s.getPlaceTags);
  const addMark = useMarksStore((s) => s.addMark);
  const removeMark = useMarksStore((s) => s.removeMark);
  const addMarksBulk = useMarksStore((s) => s.addMarksBulk);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  return { markedIds, marksByPlace, getPlaceTags, addMark, removeMark, addMarksBulk };
}
