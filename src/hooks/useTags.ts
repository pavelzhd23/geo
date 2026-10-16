import { useEffect } from "react";
import { useTagsStore } from "../stores/tagsStore";

/** CRUD тегов: подписка на стор + первичная загрузка из БД. */
export function useTags() {
  const tags = useTagsStore((s) => s.tags);
  const loaded = useTagsStore((s) => s.loaded);
  const load = useTagsStore((s) => s.load);
  const createTag = useTagsStore((s) => s.createTag);
  const renameTag = useTagsStore((s) => s.renameTag);
  const deleteTag = useTagsStore((s) => s.deleteTag);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  return { tags, load, createTag, renameTag, deleteTag };
}
