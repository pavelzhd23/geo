import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { showToast } from "../../utils/toast";

interface Props {
  title: string;
  initialValue?: string;
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
}

/** Диалог создания/переименования тега. */
export default function TagCreateDialog({ title, initialValue = "", onSubmit, onClose }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onSubmit(trimmed);
      onClose();
    } catch {
      showToast(t("tags.duplicate"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <input
          ref={inputRef}
          className="input"
          placeholder={t("tags.namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
            if (e.key === "Escape") onClose();
          }}
        />
        <div className="dialog-actions">
          <button className="btn btn-primary" onClick={() => void submit()} disabled={busy}>
            OK
          </button>
          <button className="btn" onClick={onClose}>
            {t("selection.exit")}
          </button>
        </div>
      </div>
    </div>
  );
}
