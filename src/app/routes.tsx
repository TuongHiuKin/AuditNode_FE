import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "@/app/components/Layout";
import { LoginPage } from "@/app/pages/LoginPage";
import { RegisterPage } from "@/app/pages/RegisterPage";
import { ProtectedRoute } from "@/app/components/ProtectedRoute";

const InventoryLayout = lazy(() => import("@/app/pages/InventoryLayout")
  .then((module) => ({ default: module.InventoryLayout })));
const Inventory = lazy(() => import("@/app/pages/Inventory")
  .then((module) => ({ default: module.Inventory })));
const Topology = lazy(() => import("@/app/pages/Topology")
  .then((module) => ({ default: module.Topology })));
const DependencyManager = lazy(() => import("@/app/pages/Dependency")
  .then((module) => ({ default: module.DependencyManager })));
const AdminUsers = lazy(() => import("@/app/pages/AdminUsers").then((module) => ({ default: module.AdminUsers })));
const ExternalServices = lazy(() => import("@/app/pages/ExternalServices").then((module) => ({ default: module.ExternalServices })));
const AdminUserDetail = lazy(() => import("@/app/pages/AdminUserDetail").then((module) => ({ default: module.AdminUserDetail })));
const PublicSharePage = lazy(() => import("@/features/public-share/PublicSharePage").then((module) => ({ default: module.PublicSharePage })));

function lazyRoute(element: ReactNode) {
  return (
    <Suspense fallback={(
      <div className="flex h-full items-center justify-center bg-background text-sm text-muted-foreground" role="status">
        Loading catalog view…
      </div>
    )}>
      {element}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  { path: "/login", Component: LoginPage },
  { path: "/register", Component: RegisterPage },
  { path: "/shared", element: lazyRoute(<PublicSharePage />) },
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
      { path: "external-services", element: lazyRoute(<ExternalServices />) },
      { path: "admin/users", element: <ProtectedRoute allowedRoles={["SystemAdmin"]}>{lazyRoute(<AdminUsers />)}</ProtectedRoute> },
      { path: "admin/users/:id", element: <ProtectedRoute allowedRoles={["SystemAdmin"]}>{lazyRoute(<AdminUserDetail />)}</ProtectedRoute> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
