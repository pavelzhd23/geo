import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAutoclusterStore } from "../../stores/autoclusterStore";

/**
 * Список кластеров после «Кластеризовать»: пользователь может переименовать
 * каждый кластер перед сохранением. Черновые имена («📍 #N», «📍 *»)
 * заменяются локализованными при первом рендере.
 */
export default function ClusterList() {
  const { t } = useTranslation();
  const result = useAutoclusterStore((s) => s.result);
  const renameCluster = useAutoclusterStore((s) => s.renameCluster);

  // локализация черновых имён
  useEffect(() => {
    if (!result) return;
    result.forEach((item, i) => {
      const localized =
        item.name === "📍 *"
          ? `📍 ${t("autocluster.noiseName")}`
          : /^📍 #\d+$/.test(item.name)
            ? `📍 ${t("autocluster.clusterName", { n: String(i + 1) })}`
            : null;
      if (localized && localized !== item.name) renameCluster(i, localized);
    });
  }, [result, t, renameCluster]);

  if (!result || result.length === 0) return null;

  return (
    <div className="cluster-list">
      <div className="cluster-list-title">{t("autocluster.rename")}</div>
      {result.map((item, i) => (
        <div key={i} className="cluster-row">
          <input
            className="input"
            value={item.name}
            onChange={(e) => renameCluster(i, e.target.value)}
          />
          <span className="cluster-count">{item.osmIds.length}</span>
        </div>
      ))}
    </div>
  );
}
