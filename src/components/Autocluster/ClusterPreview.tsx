import { useTranslation } from "react-i18next";
import type { PreviewInfo } from "../../stores/autoclusterStore";

interface Props {
  preview: PreviewInfo | null;
  total: number;
}

/** Строка предпросмотра: сколько кластеров/мест получится, сколько в шуме. */
export default function ClusterPreview({ preview, total }: Props) {
  const { t } = useTranslation();

  if (total === 0) {
    return <div className="cluster-preview cluster-preview-empty">{t("autocluster.noPlaces")}</div>;
  }
  if (!preview) {
    return <div className="cluster-preview cluster-preview-empty">…</div>;
  }
  return (
    <div className="cluster-preview">
      {t("autocluster.preview", { clusters: preview.clusters, places: preview.places })}
      {" · "}
      {t("autocluster.noise", { count: preview.noise })}
    </div>
  );
}
