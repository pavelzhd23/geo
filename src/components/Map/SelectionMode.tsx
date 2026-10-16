import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelectionStore } from "../../stores/selectionStore";
import { useTagsStore } from "../../stores/tagsStore";
import { useMarksStore } from "../../stores/marksStore";
import { showToast } from "../../utils/toast";

/** Панель режима выделения: включение/отмена, создание тега из выделенных. */
export default function SelectionMode() {
  const { t } = useTranslation();
  const mode = useSelectionStore((s) => s.mode);
  const selected = useSelectionStore((s) => s.selected);
  const enterMode = useSelectionStore((s) => s.enterMode);
  const exitMode = useSelectionStore((s) => s.exitMode);
  const createTag = useTagsStore((s) => s.createTag);
  const addMarksBulk = useMarksStore((s) => s.addMarksBulk);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (!mode) {
    return (
      <button className="btn btn-selection" onClick={enterMode}>
        {t("selection.mode")}
      </button>
    );
  }

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const tag = await createTag(trimmed, null);
      if (tag) {
        await addMarksBulk([...selected], tag.id);
        showToast(t("selection.created"), "success");
      }
      setName("");
      setCreating(false);
      exitMode();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="selection-panel">
      {!creating ? (
        <>
          <span className="selection-hint">{t("selection.hint")}</span>
          <button
            className="btn btn-primary"
            disabled={selected.size === 0}
            onClick={() => {
              if (selected.size === 0) {
                showToast(t("selection.empty"), "info");
                return;
              }
              setCreating(true);
            }}
          >
            {t("selection.createTag", { count: selected.size })}
          </button>
          <button className="btn" onClick={exitMode}>
            {t("selection.exit")}
          </button>
        </>
      ) : (
        <>
          <input
            autoFocus
            className="input"
            placeholder={t("tags.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
              if (e.key === "Escape") setCreating(false);
            }}
          />
          <button className="btn btn-primary" onClick={() => void submit()} disabled={busy}>
            {t("tags.create")}
          </button>
          <button className="btn" onClick={() => setCreating(false)}>
            {t("selection.exit")}
          </button>
        </>
      )}
    </div>
  );
}
