import React, { ReactNode } from "react";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Navigate, Outlet, useNavigate } from "react-router";
import { Button } from "../ui/Button";
import { useAuth } from "./AuthContext";

export interface ProtectedRouteProps {
  allowedRoles?: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Route guard component that restricts access based on allowed Keycloak realm roles.
 * Displays a 403 Access Denied interface if the user lacks required roles.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
  fallback,
}) => {
  const navigate = useNavigate();
  const { status, roles } = useAuth();

  if (status === "initializing") {
    return <div role="status" className="min-h-[40vh] grid place-items-center text-muted-foreground">Restoring session…</div>;
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const isAllowed = allowedRoles.some((role) => roles.includes(role));

    if (!isAllowed) {
      if (fallback) {
        return <>{fallback}</>;
      }

      return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] p-6 bg-background text-foreground animate-in fade-in duration-300">
          <div className="max-w-md w-full bg-panel border border-border rounded-2xl p-8 text-center shadow-2xl flex flex-col items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center text-danger shadow-[0_0_20px_rgba(229,67,95,0.2)]">
              <ShieldAlert size={36} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold font-display tracking-tight text-foreground">
                403 - Access Denied
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Bạn không có quyền truy cập vào khu vực này. Vui lòng liên hệ quản trị viên (Admin) nếu bạn cho rằng đây là lỗi.
              </p>
            </div>

            <div className="w-full pt-2 border-t border-border/50 flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="w-full justify-center gap-2"
              >
                <ArrowLeft size={16} />
                Quay lại
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate("/")}
                className="w-full justify-center"
              >
                Trang chủ
              </Button>
            </div>
          </div>
        </div>
      );
    }
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
