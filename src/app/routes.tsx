import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

const InventoryLayout = lazy(() => import("./pages/InventoryLayout")
  .then((module) => ({ default: module.InventoryLayout })));
const Inventory = lazy(() => import("./pages/Inventory")
  .then((module) => ({ default: module.Inventory })));
const Topology = lazy(() => import("./pages/Topology")
  .then((module) => ({ default: module.Topology })));
const DependencyManager = lazy(() => import("./pages/Dependency")
  .then((module) => ({ default: module.DependencyManager })));

function lazyRoute(element: ReactNode) {
  return (
    <Suspense fallback={(
      <div className="flex h-full items-center justify-center bg-background text-sm text-muted-foreground" role="status">
        Loading workspace view…
      </div>
    )}>
      {element}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  { path: "/login", Component: LoginPage },
  { path: "/register", Component: RegisterPage },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/inventory" replace /> },
      {
        path: "inventory",
        element: lazyRoute(<InventoryLayout />),
        children: [
          { index: true, element: <Navigate to="servers" replace /> },
          { path: "servers", element: lazyRoute(<Inventory key="servers" type="servers" />) },
          { path: "applications", element: lazyRoute(<Inventory key="applications" type="applications" />) },
        ],
      },
      { path: "topology", element: lazyRoute(<Topology />) },
      { path: "dependency-manager", element: lazyRoute(<DependencyManager />) },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
