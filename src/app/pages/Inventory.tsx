import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ServerTable } from "../components/ServerTable";
import { AppTable } from "../components/AppTable";
import { RegisterModal } from "../components/RegisterModal";
import { EditEntityDrawer } from "../components/EditEntityDrawer";
import { MigrationDrawer } from "../components/MigrationDrawer";
import { DeleteConfirmationModal } from "../components/DeleteConfirmationModal";
import { useInventoryContext } from "./InventoryLayout";

export function Inventory({ type }: { type: "servers" | "applications" }) {
  const { selectedIds, onSelectRow, onSelectAll } = useInventoryContext();
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [filterId, setFilterId] = useState<string | undefined>(undefined);

  // Edit State
  const [editEntity, setEditEntity] = useState<{ id: string | null; type: "SERVER" | "APP" | null }>({
    id: null,
    type: null,
  });

  // Migration State
  const [migrateAppId, setMigrateAppId] = useState<string | null>(null);

  // Delete State
  const [deleteEntity, setDeleteEntity] = useState<{ id: string | null; name: string | null; type: "SERVER" | "APP" | null }>({
    id: null,
    name: null,
    type: null,
  });

  const queryClient = useQueryClient();

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["servers"] });
    queryClient.invalidateQueries({ queryKey: ["applications"] });
  };

  const handleSelectResult = (id: string, _type: 'SERVER' | 'APP') => {
    setFilterId(id);
  };

  const handleEditClick = (id: string, type: "SERVER" | "APP") => {
    setEditEntity({ id, type });
  };

  const handleMigrateClick = (id: string) => {
    setMigrateAppId(id);
  };

  const handleDeleteClick = (id: string, name: string, type: "SERVER" | "APP") => {
    setDeleteEntity({ id, name, type });
  };

  return (
    <div className="p-8 pt-4 space-y-6 animate-in fade-in duration-500 relative min-h-full flex flex-col bg-background font-body">
      {/* Conditional Table */}
      <div className="flex-1">
        {type === "servers"
          ? <ServerTable
              onRegister={() => setIsRegisterModalOpen(true)}
              onEditClick={handleEditClick}
              onMigrateClick={handleMigrateClick}
              onDeleteClick={(id, name) => handleDeleteClick(id, name, "SERVER")}
              filterId={filterId}
              onSelectResult={handleSelectResult}
              onClearFilter={() => setFilterId(undefined)}
              selectedIds={selectedIds}
              onSelectRow={onSelectRow}
              onSelectAll={onSelectAll}
            />
          : <AppTable
              onRegister={() => setIsRegisterModalOpen(true)}
              onEditClick={handleEditClick}
              onMigrateClick={handleMigrateClick}
              onDeleteClick={(id, name) => handleDeleteClick(id, name, "APP")}
              filterId={filterId}
              onSelectResult={handleSelectResult}
              onClearFilter={() => setFilterId(undefined)}
              selectedIds={selectedIds}
              onSelectRow={onSelectRow}
              onSelectAll={onSelectAll}
            />}
      </div>

      {isRegisterModalOpen && (
        <RegisterModal
          onClose={() => setIsRegisterModalOpen(false)}
          onSuccess={refreshData}
          defaultMode={type === "servers" ? "infra" : "app"}
        />
      )}

      <EditEntityDrawer
        entityId={editEntity.id}
        entityType={editEntity.type}
        onClose={() => setEditEntity({ id: null, type: null })}
        onApplicationsUpdated={() => queryClient.invalidateQueries({ queryKey: ["applications"] })}
        onServersUpdated={() => queryClient.invalidateQueries({ queryKey: ["servers"] })}
      />

      <MigrationDrawer
        applicationId={migrateAppId}
        onClose={() => setMigrateAppId(null)}
        onApplicationsUpdated={() => queryClient.invalidateQueries({ queryKey: ["applications"] })}
        onServersUpdated={() => queryClient.invalidateQueries({ queryKey: ["servers"] })}
      />

      <DeleteConfirmationModal
        entityId={deleteEntity.id}
        entityName={deleteEntity.name}
        entityType={deleteEntity.type}
        onClose={() => setDeleteEntity({ id: null, name: null, type: null })}
        onSuccess={refreshData}
      />
    </div>
  );
}
