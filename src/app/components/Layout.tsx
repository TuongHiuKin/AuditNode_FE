import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { HeaderProvider } from "../hooks/useHeader";

export function Layout() {
  return (
    <HeaderProvider>
      <div className="flex h-screen bg-background text-foreground overflow-hidden font-body selection:bg-primary/20">
        <Sidebar />

        <main className="flex-1 flex flex-col relative z-30 overflow-hidden">
          <Topbar />
          <div className="flex-1 overflow-y-auto relative flex flex-col bg-background">
            <Outlet />
          </div>
        </main>
      </div>
    </HeaderProvider>
  );
}
