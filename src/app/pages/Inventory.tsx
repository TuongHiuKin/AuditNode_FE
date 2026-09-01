import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ServerTable } from "../components/ServerTable";
import { AppTable } from "../components/AppTable";
import { EditEntityDrawer } from "../components/EditEntityDrawer";
import { MigrationDrawer } from "../components/MigrationDrawer";
import { DeleteConfirmationModal } from "../components/DeleteConfirmationModal";
import { useInventoryContext } from "./InventoryLayout";

export function Inventory({ type }: { type: "servers" | "applications" }) {
  const { selectedIds, onSelectRow, onSelectAll, isSelectionMode, selectedColumns, toggleColumn, toolbarEl, onOpenCreateDc } = useInventoryContext();
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
    queryClient.invalidateQueries({ queryKey: ["catalog"] });
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
    <div className="flex-1 flex flex-col min-h-0 bg-background font-body relative">
      {/* Conditional Table */}
      <div className="flex-1 min-h-0 flex flex-col">
        {type === "servers"
          ? <ServerTable
              onEditClick={handleEditClick}
              onMigrateClick={handleMigrateClick}
              onDeleteClick={(id, name) => handleDeleteClick(id, name, "SERVER")}
              filterId={filterId}
              onSelectResult={handleSelectResult}
              onClearFilter={() => setFilterId(undefined)}
              selectedIds={selectedIds}
              onSelectRow={onSelectRow}
              onSelectAll={onSelectAll}
              isSelectionMode={isSelectionMode}
              selectedColumns={selectedColumns}
              toggleColumn={toggleColumn}
              toolbarEl={toolbarEl}
              onOpenCreateDc={onOpenCreateDc}
            />
          : <AppTable
              onEditClick={handleEditClick}
              onMigrateClick={handleMigrateClick}
              onDeleteClick={(id, name) => handleDeleteClick(id, name, "APP")}
              filterId={filterId}
              onSelectResult={handleSelectResult}
              onClearFilter={() => setFilterId(undefined)}
              selectedIds={selectedIds}
              onSelectRow={onSelectRow}
              onSelectAll={onSelectAll}
              isSelectionMode={isSelectionMode}
              selectedColumns={selectedColumns}
              toggleColumn={toggleColumn}
              toolbarEl={toolbarEl}
            />}
      </div>

      <EditEntityDrawer
        entityId={editEntity.id}
        entityType={editEntity.type}
        onClose={() => setEditEntity({ id: null, type: null })}
        onApplicationsUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ["catalog"] });
        }}
        onServersUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ["catalog"] });
        }}
      />

      <MigrationDrawer
        applicationId={migrateAppId}
        onClose={() => setMigrateAppId(null)}
        onApplicationsUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ["catalog"] });
        }}
        onServersUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ["catalog"] });
        }}
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
