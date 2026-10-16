import { useTranslation } from "react-i18next";
import MapView from "./components/Map/MapView";
import TagTree from "./components/Sidebar/TagTree";
import PlaceCard from "./components/PlaceCard/PlaceCard";
import { useMarks } from "./hooks/useMarks";
import "./App.css";

export default function App() {
  useTranslation();
  // инициализация пометок из БД при старте
  useMarks();

  return (
    <div className="app-layout">
      <TagTree />
      <main className="main">
        <MapView />
      </main>
      <PlaceCard />
    </div>
  );
}
