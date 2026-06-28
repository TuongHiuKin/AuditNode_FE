import { Navigate, Outlet } from "react-router";

export function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
