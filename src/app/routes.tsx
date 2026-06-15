import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { InventoryLayout } from "./pages/InventoryLayout";
import { Inventory } from "./pages/Inventory";
import { Topology } from "./pages/Topology";
import { DependencyManager } from "./pages/Dependency";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, element: <Navigate to="/inventory" replace /> },
      {
        path: "inventory",
        Component: InventoryLayout,
        children: [
          { index: true, element: <Navigate to="servers" replace /> },
          { path: "servers", element: <Inventory key="servers" type="servers" /> },
          { path: "applications", element: <Inventory key="applications" type="applications" /> },
        ],
      },
      { path: "topology", Component: Topology },
      { path: "dependency-manager", Component: DependencyManager },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
