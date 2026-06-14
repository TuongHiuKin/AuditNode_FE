
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { initKeycloak } from "./services/keycloakService";

  const renderApp = () => {
    createRoot(document.getElementById("root")!).render(<App />);
  };

  // Initialize Keycloak and render app only after successful authentication
  initKeycloak(renderApp);
  