import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Tag } from "../../types";
import { useTags } from "../../hooks/useTags";
import { useFilterStore } from "../../stores/filterStore";
import { useAutoclusterStore } from "../../stores/autoclusterStore";
import { showToast } from "../../utils/toast";
import TagNode from "./TagNode";
import TagCreateDialog from "./TagCreateDialog";

/** Левая панель: автокластеризация + дерево тегов города + управление фильтром. */
export default function TagTree() {
  const { t } = useTranslation();
  const { tags, createTag } = useTags();
  const activeTagId = useFilterStore((s) => s.activeTagId);
  const clearFilter = useFilterStore((s) => s.clear);
  const openAutocluster = useAutoclusterStore((s) => s.open);
  const [creatingRoot, setCreatingRoot] = useState(false);

  const childrenByParent = useMemo(() => {
    const map = new Map<number | null, Tag[]>();
    for (const tag of tags) {
      const key = tag.parent_id ?? null;
      const list = map.get(key) ?? [];
      list.push(tag);
      map.set(key, list);
    }
    // обычные теги — по алфавиту, автокластеры («📍 …») — в конец списка
    for (const list of map.values())
      list.sort((a, b) => a.is_auto - b.is_auto || a.name.localeCompare(b.name, "ru"));
    return map;
  }, [tags]);

  const roots = childrenByParent.get(null) ?? [];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>{t("app.title")}</h2>
        <button className="btn btn-primary btn-small" onClick={() => setCreatingRoot(true)}>
          {t("tags.create")} +
        </button>
      </div>

      {/* Кнопка автокластеризации — над деревом тегов */}
      <button className="btn btn-autocluster" onClick={openAutocluster}>
        ⚙ {t("autocluster.button")}
      </button>

      {activeTagId != null && (
        <button className="btn btn-reset" onClick={clearFilter}>
          {t("filter.reset")} ✕
        </button>
      )}

      <div className="tag-tree">
        {roots.length === 0 ? (
          <p className="sidebar-empty">{t("tags.empty")}</p>
        ) : (
          roots.map((tag) => (
            <TagNode key={tag.id} tag={tag} childrenByParent={childrenByParent} depth={0} />
          ))
        )}
      </div>

      {creatingRoot && (
        <TagCreateDialog
          title={t("tags.newRoot")}
          onSubmit={async (name) => {
            await createTag(name, null);
            showToast(t("tags.saved"), "success");
          }}
          onClose={() => setCreatingRoot(false)}
        />
      )}
    </aside>
  );
}
