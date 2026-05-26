import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { Inventory } from "./pages/Inventory";
import { Topology } from "./pages/Topology";
import { DependencyManager } from "./pages/Dependency";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Inventory },
      { path: "topology", Component: Topology },
      { path: "dependency-manager", Component: DependencyManager },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
