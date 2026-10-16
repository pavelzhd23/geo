import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Tag } from "../../types";
import { useTagsStore } from "../../stores/tagsStore";
import { useFilterStore } from "../../stores/filterStore";
import { showToast } from "../../utils/toast";
import TagCreateDialog from "./TagCreateDialog";

interface Props {
  tag: Tag;
  childrenByParent: Map<number | null, Tag[]>;
  depth: number;
}

export default function TagNode({ tag, childrenByParent, depth }: Props) {
  const { t } = useTranslation();
  const renameTag = useTagsStore((s) => s.renameTag);
  const deleteTag = useTagsStore((s) => s.deleteTag);
  const createTag = useTagsStore((s) => s.createTag);
  const activeTagId = useFilterStore((s) => s.activeTagId);
  const setFilter = useFilterStore((s) => s.setFilter);

  const [expanded, setExpanded] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<"rename" | "child" | null>(null);

  const children = childrenByParent.get(tag.id) ?? [];
  const hasChildren = children.length > 0;
  const isActive = activeTagId === tag.id;

  return (
    <div className="tag-node">
      <div
        className={`tag-row ${isActive ? "tag-row-active" : ""}`}
        style={{ paddingLeft: 8 + depth * 16 }}
        onClick={() => void setFilter(tag.id, tag.name)}
        onDoubleClick={() => setDialog("rename")}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenuOpen(true);
        }}
      >
        <span
          className="tag-toggle"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          {hasChildren ? (expanded ? "▾" : "▸") : ""}
        </span>
        <span className="tag-icon">{hasChildren ? "📁" : "📄"}</span>
        <span className="tag-name">{tag.name}</span>
        <button
          className="tag-add-child"
          title={t("tags.newChild")}
          onClick={(e) => {
            e.stopPropagation();
            setDialog("child");
          }}
        >
          +
        </button>
      </div>

      {menuOpen && (
        <>
          <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
          <div className="context-menu">
            <button
              onClick={() => {
                setMenuOpen(false);
                setDialog("rename");
              }}
            >
              {t("tags.rename")}
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                setDialog("child");
              }}
            >
              {t("tags.newChild")}
            </button>
            <button
              className="context-menu-danger"
              onClick={() => {
                setMenuOpen(false);
                if (window.confirm(t("tags.deleteConfirm", { name: tag.name }))) {
                  void deleteTag(tag.id).then(() => showToast(t("tags.deleted"), "success"));
                }
              }}
            >
              {t("tags.delete")}
            </button>
          </div>
        </>
      )}

      {dialog === "rename" && (
        <TagCreateDialog
          title={t("tags.rename")}
          initialValue={tag.name}
          onSubmit={async (name) => {
            await renameTag(tag.id, name);
            showToast(t("tags.saved"), "success");
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "child" && (
        <TagCreateDialog
          title={`${t("tags.newChild")}: ${tag.name}`}
          onSubmit={async (name) => {
            await createTag(name, tag.id);
            setExpanded(true);
            showToast(t("tags.saved"), "success");
          }}
          onClose={() => setDialog(null)}
        />
      )}

      {expanded &&
        children.map((child) => (
          <TagNode key={child.id} tag={child} childrenByParent={childrenByParent} depth={depth + 1} />
        ))}
    </div>
  );
}
