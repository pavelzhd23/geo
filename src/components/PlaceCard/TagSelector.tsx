import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Tag } from "../../types";
import { useTagsStore } from "../../stores/tagsStore";
import { useMarksStore } from "../../stores/marksStore";
import { showToast } from "../../utils/toast";

interface Props {
  osmId: string;
  existingTagIds: Set<number>;
  onClose: () => void;
}

/** Dropdown: дерево существующих тегов + создание нового. */
export default function TagSelector({ osmId, existingTagIds, onClose }: Props) {
  const { t } = useTranslation();
  const tags = useTagsStore((s) => s.tags);
  const createTag = useTagsStore((s) => s.createTag);
  const addMark = useMarksStore((s) => s.addMark);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const childrenByParent = useMemo(() => {
    const map = new Map<number | null, Tag[]>();
    for (const tag of tags) {
      const key = tag.parent_id ?? null;
      const list = map.get(key) ?? [];
      list.push(tag);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    return map;
  }, [tags]);

  const pick = async (tagId: number) => {
    if (busy) return;
    setBusy(true);
    try {
      await addMark(osmId, tagId);
      showToast(t("place.tagAdded"), "success");
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const renderLevel = (parentKey: number | null, depth: number): JSX.Element[] => {
    const list = childrenByParent.get(parentKey) ?? [];
    const out: JSX.Element[] = [];
    for (const tag of list) {
      const used = existingTagIds.has(tag.id);
      out.push(
        <button
          key={tag.id}
          className={`tree-item ${used ? "tree-item-disabled" : ""}`}
          style={{ paddingLeft: 10 + depth * 18 }}
          disabled={used || busy}
          onClick={() => void pick(tag.id)}
        >
          {(childrenByParent.get(tag.id)?.length ?? 0) > 0 ? "📁 " : "📄 "}
          {tag.name}
          {used ? " ✓" : ""}
        </button>
      );
      out.push(...renderLevel(tag.id, depth + 1));
    }
    return out;
  };

  const createAndPick = async () => {
    const trimmed = newName.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const tag = await createTag(trimmed, null);
      if (tag) {
        await addMark(osmId, tag.id);
        showToast(t("place.tagAdded"), "success");
        onClose();
      } else {
        showToast(t("tags.duplicate"), "error");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tag-selector">
      <div className="tag-selector-title">{t("place.selectExisting")}</div>
      <div className="tag-selector-tree">
        {tags.length === 0 ? <div className="sidebar-empty">{t("tags.empty")}</div> : renderLevel(null, 0)}
      </div>
      <div className="tag-selector-create">
        <input
          className="input"
          placeholder={`${t("place.createNew")}…`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void createAndPick();
            if (e.key === "Escape") onClose();
          }}
        />
        <button className="btn btn-primary btn-small" onClick={() => void createAndPick()} disabled={busy}>
          {t("tags.create")}
        </button>
      </div>
    </div>
  );
}
