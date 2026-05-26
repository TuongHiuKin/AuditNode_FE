import { useState } from "react";
import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { RegisterModal } from "./RegisterModal";

export function Layout() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background text-primary overflow-hidden font-body selection:bg-tertiary/30">
      <Sidebar />

      <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <Topbar onOpenModal={() => setIsModalOpen(true)} />
        <div className="flex-1 overflow-hidden relative flex flex-col bg-background">
          <Outlet />
        </div>
      </main>

      {/* Global Registration Modal */}
      {isModalOpen && (
        <RegisterModal onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}
