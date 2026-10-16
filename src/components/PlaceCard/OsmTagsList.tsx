import { useState } from "react";
import { useTranslation } from "react-i18next";

/** Сворачиваемый список OSM-тегов вида ключ: значение. */
export default function OsmTagsList({ tags }: { tags: Record<string, string> }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const entries = Object.entries(tags).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return null;

  return (
    <div className="osm-tags">
      <button className="collapse-header" onClick={() => setOpen((v) => !v)}>
        {open ? "▾" : "▸"} {t("place.osmTags")} ({entries.length})
      </button>
      {open && (
        <ul className="osm-tags-list">
          {entries.map(([k, v]) => (
            <li key={k}>
              <span className="osm-key">{k}:</span> <span className="osm-value">{v}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
