import { useEffect } from "react";
import { useTagsStore } from "../stores/tagsStore";
import { useCityStore } from "../stores/cityStore";

/** CRUD тегов: подписка на стор + первичная загрузка из БД (текущего города). */
export function useTags() {
  const tags = useTagsStore((s) => s.tags);
  const load = useTagsStore((s) => s.load);
  const createTag = useTagsStore((s) => s.createTag);
  const renameTag = useTagsStore((s) => s.renameTag);
  const deleteTag = useTagsStore((s) => s.deleteTag);
  const cityId = useCityStore((s) => s.currentCityId);

  // При смене города дерево тегов перезагружается (изоляция по городам)
  useEffect(() => {
    if (cityId != null) void load(cityId);
  }, [cityId, load]);

  return { tags, load, createTag, renameTag, deleteTag };
}
