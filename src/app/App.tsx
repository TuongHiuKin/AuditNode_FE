import { RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { router } from "./routes";
import { AuthProvider, useAuth } from "../shared/auth/AuthContext";
import { registerSessionCacheClearer } from "../shared/auth/authStore";
import { CatalogAccessProvider } from "../shared/catalog/CatalogAccessContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  useEffect(() => {
    registerSessionCacheClearer(() => queryClient.clear());
    return () => registerSessionCacheClearer(() => undefined);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthenticatedApplication />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AuthenticatedApplication() {
  const { status, user } = useAuth();
  const principalId = status === "authenticated" && user ? user.id : "anonymous";
  return (
    <CatalogAccessProvider key={principalId} principalId={principalId}>
      <RouterProvider router={router} />
    </CatalogAccessProvider>
  );
}
