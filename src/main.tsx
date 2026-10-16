import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./i18n";
import App from "./App";
import "./index.css";
import { useCityStore } from "./stores/cityStore";

function Root() {
  const loadCities = useCityStore((s) => s.loadCities);
  const loaded = useCityStore((s) => s.loaded);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void loadCities().finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready || !loaded) return null;
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
