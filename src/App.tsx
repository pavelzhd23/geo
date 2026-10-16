import { useTranslation } from "react-i18next";
import MapView from "./components/Map/MapView";
import TagTree from "./components/Sidebar/TagTree";
import PlaceCard from "./components/PlaceCard/PlaceCard";
import CitySelector from "./components/City/CitySelector";
import AutoclusterDialog from "./components/Autocluster/AutoclusterDialog";
import { useMarks } from "./hooks/useMarks";
import "./App.css";

export default function App() {
  useTranslation();
  // инициализация пометок из БД при старте (текущего города)
  useMarks();

  return (
    <div className="app-layout">
      <header className="app-header">
        <CitySelector />
      </header>
      <div className="app-body">
        <TagTree />
        <main className="main">
          <MapView />
        </main>
        <PlaceCard />
      </div>
      {/* Модалка автокластеризации поверх всего */}
      <AutoclusterDialog />
    </div>
  );
}
