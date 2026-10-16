import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Tag } from "../../types";
import { useMapStore } from "../../stores/mapStore";
import { useMarksStore } from "../../stores/marksStore";
import { showToast, translateCategory } from "../../utils/toast";
import OsmTagsList from "./OsmTagsList";
import TagSelector from "./TagSelector";

/** Правая панель с карточкой выбранного места. */
export default function PlaceCard() {
  const { t } = useTranslation();
  const place = useMapStore((s) => s.selectedPlace);
  const selectPlace = useMapStore((s) => s.selectPlace);
  const marksByPlace = useMarksStore((s) => s.marksByPlace);
  const getPlaceTags = useMarksStore((s) => s.getPlaceTags);
  const removeMark = useMarksStore((s) => s.removeMark);
  const [selectorOpen, setSelectorOpen] = useState(false);

  const osmId = place?.osm_id ?? null;
  const myTags: Tag[] | undefined = osmId ? marksByPlace[osmId] : undefined;

  useEffect(() => {
    if (osmId) void getPlaceTags(osmId);
  }, [osmId, getPlaceTags]);

  if (!place) return null;

  const existingIds = new Set((myTags ?? []).map((tg) => tg.id));

  return (
    <aside className="place-card">
      <div className="place-card-header">
        <h2 className="place-title">{place.name || t("place.untitled")}</h2>
        <button className="btn btn-small" title={t("place.close")} onClick={() => selectPlace(null)}>
          ✕
        </button>
      </div>

      {place.category && (
        <div className="place-category">
          {t("place.category")}: {translateCategory(t, place.category)}
        </div>
      )}

      <div className="place-coords">
        {t("place.coordinates")}: {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
      </div>

      <section className="place-section">
        <h3>{t("place.myTags")}</h3>
        {myTags === undefined ? (
          <p>…</p>
        ) : myTags.length === 0 ? (
          <p className="sidebar-empty">{t("place.noTags")}</p>
        ) : (
          <ul className="my-tags">
            {myTags.map((tg) => (
              <li key={tg.id}>
                <span className="my-tag-chip">📄 {tg.name}</span>
                <button
                  className="btn-remove"
                  title={t("place.removeTag")}
                  onClick={() =>
                    void removeMark(place.osm_id, tg.id).then(() =>
                      showToast(t("place.tagRemoved"), "success")
                    )
                  }
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="add-tag-wrap">
          <button className="btn btn-primary" onClick={() => setSelectorOpen((v) => !v)}>
            {t("place.addTag")}
          </button>
          {selectorOpen && (
            <TagSelector
              osmId={place.osm_id}
              existingTagIds={existingIds}
              onClose={() => setSelectorOpen(false)}
            />
          )}
        </div>
      </section>

      <section className="place-section">
        <OsmTagsList tags={place.allTags} />
      </section>
    </aside>
  );
}
