import { useState, useEffect, useCallback, useRef } from "react";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  MarkerType,
  type Node,
  type InternalNode,
  type Edge,
  type EdgeChange,
  type Connection,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange
} from "@xyflow/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient, { type Schemas } from "../../../shared/api/client";
import { type AppNodeData, PaletteApp, type ServerNodeData, SelectedItem } from "../types";
import { useAppPalette } from "./useAppPalette";
import { toast } from "sonner";
import { useCatalogAccess } from "../../../shared/catalog/CatalogAccessContext";
import { registerSharedCatalogInvalidator } from "../../../shared/catalog/catalogCache";
import { exportToExcel } from "../../../shared/utils/exportUtils";
import { getErrorMessage } from "../../../shared/utils/errorUtils";
import {
  buildDependencySyncRequest,
  buildTopologyCommandBatch,
  hasDeploymentId,
  mapDependencyGraph,
  restoreTopologyState,
  stableGraphUuid,
  toTopologyState,
  validateConnection,
  type DependencyMapResponse,
  type SaveTopologyState,
  type TopologyState,
  type PendingTopologyChanges,
} from "../graphContract";


const edgeStyle = { stroke: "#3b82f6", strokeWidth: 2 };
const edgeMarker = { type: MarkerType.ArrowClosed, color: "#3b82f6" };

const emptyPendingChanges = (): PendingTopologyChanges => ({
  changedNodeIds: new Set<string>(),
  deletedNodeIds: new Set<string>(),
  createdEdgeIds: new Set<string>(),
  changedEdgeIds: new Set<string>(),
  deletedEdgeIds: new Set<string>(),
});

export function useDependencyLogic() {
  const { view, sharedEnabled, filters } = useCatalogAccess();
  const graphScopeKey = `${view}:${filters.ownerUserId ?? "all"}`;
  const canCreateGraphStructure = view === "mine";
  const topologyVersionRef = useRef(0);
  const pendingChangesRef = useRef<PendingTopologyChanges>(emptyPendingChanges());
  const [nodes, setNodes] = useState<Node[]>([]);
  const canEditGraph = view === "mine" || nodes.some((node) => node.data?.canEdit === true);
  const isAuditor = view === "shared" && canEditGraph;
  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      const allowedChanges = view === "shared"
        ? changes.filter((change) => "id" in change && nodes.some((node) => node.id === change.id && node.data?.canEdit === true))
        : changes;
      if (isAuditor) {
        allowedChanges.forEach((change) => {
          if (change.type === "position" || (change.type === "dimensions" && change.resizing === true)) {
            (pendingChangesRef.current.changedNodeIds as Set<string>).add(change.id);
          } else if (change.type === "remove") {
            (pendingChangesRef.current.deletedNodeIds as Set<string>).add(change.id);
            (pendingChangesRef.current.changedNodeIds as Set<string>).delete(change.id);
          }
        });
      }
      setNodes((current) => applyNodeChanges(allowedChanges, current));
    },
    [isAuditor, nodes, view]
  );
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const onEdgesChange = useCallback((changes: EdgeChange<Edge>[]) => {
    const allowedChanges = view === "shared"
      ? changes.filter((change) => "id" in change && edges.some((edge) => edge.id === change.id && edge.data?.canEdit === true))
      : changes;
    if (isAuditor) {
      allowedChanges.forEach((change) => {
        if (change.type === "remove") {
          (pendingChangesRef.current.deletedEdgeIds as Set<string>).add(change.id);
          (pendingChangesRef.current.changedEdgeIds as Set<string>).delete(change.id);
        }
      });
    }
    setEdges((current) => applyEdgeChanges(allowedChanges, current));
  }, [edges, isAuditor, setEdges, view]);
  const { availableApps, isLoading: isAppsLoading, refetch: refetchApps } = useAppPalette();
  const [selectedItem, setSelectedItem] = useState<SelectedItem>({ type: null, id: null });
  const [rightPanelData, setRightPanelData] = useState<any>(null);

  const [selectedEnv, setSelectedEnv] = useState("All");
  const [selectedDatacenter, setSelectedDatacenter] = useState("All");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  const [isSyncing, setIsSyncing] = useState(false);

  const reactFlowInstance = useReactFlow();
  const queryClient = useQueryClient();

  const isExplicitFetchRef = useRef(false);
  const activeGraphScopeRef = useRef(graphScopeKey);

  useEffect(() => {
    activeGraphScopeRef.current = graphScopeKey;
    topologyVersionRef.current = 0;
    pendingChangesRef.current = emptyPendingChanges();
    setNodes([]);
    setEdges([]);
    setSelectedItem({ type: null, id: null });
    setRightPanelData(null);
    setSelectedEnv("All");
    setSelectedDatacenter("All");
    setSelectedLabels([]);
  }, [graphScopeKey, setEdges]);

  useEffect(() => registerSharedCatalogInvalidator(() => {
    if (view !== "shared") return;
    topologyVersionRef.current = 0;
    pendingChangesRef.current = emptyPendingChanges();
    setNodes([]);
    setEdges([]);
    setSelectedItem({ type: null, id: null });
    setRightPanelData(null);
    void queryClient.cancelQueries({ queryKey: ["catalog-graph"] }).then(() => {
      queryClient.removeQueries({ queryKey: ["catalog-graph"] });
    });
  }), [queryClient, setEdges, view]);

  const isNarrowedGraph = selectedEnv !== "All"
    || selectedDatacenter !== "All"
    || selectedLabels.length > 0;

  const requireCompleteGraph = useCallback(() => {
    if (!isNarrowedGraph) return true;
    toast.error("Set Environment and Datacenter to All and clear Labels before saving or syncing the complete graph.");
    return false;
  }, [isNarrowedGraph]);

  // ── Scoped Export Algorithm ─────────────────────────────────────────────


  const exportGroupAuditMatrix = useCallback(async (groupId: string, groupLabel: string) => {
    // 1. Identify all child nodes recursively (handling apps inside servers inside groups)
    const childNodes = nodes.filter(n => n.parentId === groupId);
    const serverIds = childNodes.filter(n => n.type === 'serverNode').map(n => n.id);
    
    // Find apps that are either directly in group OR in a server that is in group
    const appNodesInGroup = nodes.filter(n => 
      n.type === 'appNode' && (n.parentId === groupId || (n.parentId && serverIds.includes(n.parentId)))
    );

    const groupNodeIds = new Set([groupId, ...childNodes.map(n => n.id), ...appNodesInGroup.map(n => n.id)]);

    // 2. Filter edges where BOTH source and target are within the group boundaries
    const scopedEdges = edges.filter(e => 
      groupNodeIds.has(e.source) && groupNodeIds.has(e.target)
    );

    // 3. Map into Audit Matrix Format
    const auditData = scopedEdges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      const sourceApp = sourceNode?.type === "appNode" ? (sourceNode.data as AppNodeData).app : undefined;
      const targetApp = targetNode?.type === "appNode" ? (targetNode.data as AppNodeData).app : undefined;
      const sourceServer = sourceNode?.type === "serverNode" ? (sourceNode.data as ServerNodeData).server : undefined;
      const targetServer = targetNode?.type === "serverNode" ? (targetNode.data as ServerNodeData).server : undefined;
      
      return {
        "Source Component": sourceApp?.appName || sourceServer?.hostname || "Unknown",
        "Source IP": sourceServer?.ipAddress || "Internal",
        "Target Component": targetApp?.appName || targetServer?.hostname || "Unknown",
        "Target IP": targetServer?.ipAddress || "Internal",
        "Port": targetApp?.portNumber || edge.data?.protocol || "Any",
        "Protocol": edge.data?.protocol || "TCP",
        "Port Mapping ID": targetApp?.portMappingId || "N/A",
        "Catalog owner": filters.ownerUserId || (view === "mine" ? "Mine" : "Shared"),
      };
    });

    if (auditData.length === 0) {
      toast.error("No connections found within this group to export.");
      return;
    }

    const date = new Date().toISOString().split('T')[0];
    const cleanGroupLabel = groupLabel.replace(/\s+/g, '_');
    const catalogName = (filters.ownerUserId || `${view}-catalog`)
      .replace(/[^a-zA-Z0-9_-]+/g, "_");
    try {
      await exportToExcel(auditData, `${catalogName}_${cleanGroupLabel}_AuditMatrix_${date}`);
      toast.success(`Exported ${auditData.length} connections for ${groupLabel}`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to export audit matrix."));
    }
  }, [edges, nodes, filters.ownerUserId, view]);

  const checkEmptyFrame = useCallback((type: 'groupNode' | 'boundaryFrame') => {
    const hasEmpty = nodes.some(n => {
      if (n.type !== type) return false;
      return !nodes.some(child => child.parentId === n.id);
    });
    if (hasEmpty) {
      toast.error(`Vui lòng sử dụng ${type === 'groupNode' ? 'Group Box' : 'Boundary Frame'} rỗng hiện tại trước khi tạo mới!`);
      return true;
    }
    return false;
  }, [nodes]);

  const addGroupBox = useCallback(() => {
    if (checkEmptyFrame('groupNode')) return;
    setDrawingMode('groupBox');
    toast.info("Vẽ một khung trên màn hình để tạo Group");
  }, [checkEmptyFrame]);

  const addBoundaryFrame = useCallback(async () => {
    if (checkEmptyFrame('boundaryFrame')) return;
    setDrawingMode('boundaryFrame');
    toast.info("Vẽ một khung trên màn hình để tạo Boundary Frame");
  }, [checkEmptyFrame]);

  const onNodeDragStop = useCallback(
    async (_: React.MouseEvent, node: Node) => {
      if (node.type === "boundaryFrame" || node.type === "appNode") return;
      if (isAuditor) (pendingChangesRef.current.changedNodeIds as Set<string>).add(node.id);

      const frames = nodes.filter((n) => n.type === "boundaryFrame");

      const intersectingFrame = frames.find((frame) => {
        const frameX = frame.position.x;
        const frameY = frame.position.y;
        const frameW = frame.measured?.width || Number(frame.style?.width) || 0;
        const frameH = frame.measured?.height || Number(frame.style?.height) || 0;

        const internalNode = node as InternalNode;
        const nodeAbsX = internalNode.internals?.positionAbsolute?.x || node.position.x;
        const nodeAbsY = internalNode.internals?.positionAbsolute?.y || node.position.y;
        const nodeW = node.measured?.width || 0;
        const nodeH = node.measured?.height || 0;

        const nodeCenterX = nodeAbsX + nodeW / 2;
        const nodeCenterY = nodeAbsY + nodeH / 2;

        return (
          nodeCenterX >= frameX &&
          nodeCenterX <= frameX + frameW &&
          nodeCenterY >= frameY &&
          nodeCenterY <= frameY + frameH
        );
      });

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === node.id) {
            if (intersectingFrame) {
              const internalDragNode = node as InternalNode;
              const relativeX = (internalDragNode.internals?.positionAbsolute?.x || node.position.x) - intersectingFrame.position.x;
              const relativeY = (internalDragNode.internals?.positionAbsolute?.y || node.position.y) - intersectingFrame.position.y;

              return {
                ...n,
                parentId: intersectingFrame.id,
                extent: "parent",
                position: { x: relativeX, y: relativeY },
              };
            } else {
              const internalDragNode = node as InternalNode;
              return {
                ...n,
                parentId: undefined,
                extent: undefined,
                position: internalDragNode.internals?.positionAbsolute || node.position,
              };
            }
          }
          return n;
        })
      );

      // Eager saving removed - wait for user to click Save Network State
    },
    [isAuditor, nodes, setNodes]
  );


  // ── Sync to Database ─────────────────────────────────────────────────────
  const handleSync = useCallback(async () => {
    if (!requireCompleteGraph()) return;
    if (!canEditGraph) {
      toast.error("You only have Viewer access to this graph.");
      return;
    }
    if (isAuditor) {
      toast.info("Auditor changes must be saved as scoped graph commands.");
      return;
    }
    setIsSyncing(true);
    try {
      const currentNodes = reactFlowInstance.getNodes();
      const currentEdges = reactFlowInstance.getEdges();
      const request: SaveTopologyState = {
        ...toTopologyState(currentNodes, currentEdges, topologyVersionRef.current),
        ...buildDependencySyncRequest(currentNodes, currentEdges),
        version: topologyVersionRef.current,
      };
      await apiClient.put("/api/v1/topology/state", request, { catalogRequest: true, catalogView: view });
      topologyVersionRef.current += 1;
      
      toast.success("Network state synchronized successfully");
      
      // Reset edge animations/colors to "saved" state by refetching
      await queryClient.invalidateQueries({ queryKey: ["catalog-graph", "dependency-map"] });
    } catch (error: unknown) {
      console.error("Sync failed:", error);
      toast.error(getErrorMessage(error, "Failed to synchronize network state"));
    } finally {
      setIsSyncing(false);
    }
  }, [canEditGraph, isAuditor, reactFlowInstance, queryClient, requireCompleteGraph, view]);

  // ── Fetch all servers to determine mapping status ────────────────────────
  const { data: allServers = [] } = useQuery<Schemas["ServerResponseDto"][]>({
    queryKey: ["catalog-graph", "all-servers", view, filters.ownerUserId ?? "all"],
    queryFn: async () => {
      const response = await apiClient.get<{ items: Schemas["ServerResponseDto"][] }>("/api/v1/servers", { params: { view, limit: 100, ownerUserId: filters.ownerUserId || undefined }, catalogRequest: true, catalogView: view });
      const data = response.data.items ?? [];
      return data as Schemas["ServerResponseDto"][];
    },
    enabled: view === "mine" || sharedEnabled,
  });

  const unmappedServers = allServers.filter(
    (srv: Schemas["ServerResponseDto"]) => !nodes.some((n) => n.id === srv.id && n.type === "serverNode")
  );

  const canDrawServer = unmappedServers.length > 0;

  // ── Draw to Create Logic ──────────────────────────────────────────
  const [drawingMode, setDrawingMode] = useState<'server' | 'groupBox' | 'boundaryFrame' | null>(null);
  const [drawBox, setDrawBox] = useState<{ 
    screenStartX: number; screenStartY: number; screenCurrentX: number; screenCurrentY: number;
    flowStartX: number; flowStartY: number; flowCurrentX: number; flowCurrentY: number;
  } | null>(null);

  const onPaneMouseDown = useCallback((event: React.MouseEvent) => {
    if (!drawingMode) return;
    if (drawingMode === 'server' && !canDrawServer) return;

    const flowPos = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    setDrawBox({
      screenStartX: screenX,
      screenStartY: screenY,
      screenCurrentX: screenX,
      screenCurrentY: screenY,
      flowStartX: flowPos.x,
      flowStartY: flowPos.y,
      flowCurrentX: flowPos.x,
      flowCurrentY: flowPos.y,
    });
  }, [drawingMode, canDrawServer, reactFlowInstance]);

  const onPaneMouseMove = useCallback((event: React.MouseEvent) => {
    if (!drawBox) return;

    const flowPos = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    setDrawBox((prev) => prev ? ({
      ...prev,
      screenCurrentX: screenX,
      screenCurrentY: screenY,
      flowCurrentX: flowPos.x,
      flowCurrentY: flowPos.y,
    }) : null);
  }, [drawBox, reactFlowInstance]);

  const onPaneMouseUp = useCallback(async () => {
    if (!drawBox || !drawingMode) return;

    const width = Math.abs(drawBox.flowCurrentX - drawBox.flowStartX);
    const height = Math.abs(drawBox.flowCurrentY - drawBox.flowStartY);
    const x = Math.min(drawBox.flowStartX, drawBox.flowCurrentX);
    const y = Math.min(drawBox.flowStartY, drawBox.flowCurrentY);

    if (width > 50 && height > 50) {
      if (drawingMode === 'server' && unmappedServers.length > 0) {
        const targetServer = unmappedServers[0];
        const newNode: Node = {
          id: targetServer.id!,
          type: "serverNode",
          position: { x, y },
          style: { width, height },
          data: {
            server: {
              serverId: targetServer.id,
              hostname: targetServer.hostname,
              ipAddress: targetServer.ipAddress,
              osType: targetServer.osType
            },
            width,
            height
          },
          zIndex: -1,
        };
        setNodes((nds) => nds.concat(newNode));
      } else if (drawingMode === 'groupBox') {
        const id = crypto.randomUUID();
        const newNode: Node = {
          id,
          type: 'groupNode',
          position: { x, y },
          data: { 
            label: "New Infrastructure Cluster",
            onExportAudit: exportGroupAuditMatrix
          },
          style: { width, height },
          zIndex: -1,
          selected: true,
        };
        setNodes((nds) => nds.concat(newNode));
      } else if (drawingMode === 'boundaryFrame') {
        const id = crypto.randomUUID();
        const newNode: Node = {
          id,
          type: "boundaryFrame",
          position: { x, y },
          style: { width, height },
          data: { name: "New Group" },
          zIndex: -1,
          draggable: true,
          dragHandle: '.custom-drag-handle',
          selected: true,
        };
        setNodes((nds) => [...nds, newNode]);
      }
    }

    setDrawBox(null);
    setDrawingMode(null);
  }, [drawBox, unmappedServers, setNodes, drawingMode, exportGroupAuditMatrix]);

  // ── Fetch and Map Graph Logic (Internal) ────────────────────────────────
  const fetchAndMapGraph = useCallback(async (
    env: string,
    dc: string,
    labels: string[] = [],
    signal?: AbortSignal,
  ) => {
    try {
      const response = await apiClient.get<DependencyMapResponse>(
        "/api/v1/topology/map",
        {
          params: {
            environment: env === "All" ? undefined : env,
            datacenterId: dc === "All" ? undefined : dc,
            labels: labels.length > 0 ? labels : undefined,
            ownerUserId: filters.ownerUserId || undefined,
          },
          signal,
          catalogRequest: true,
          catalogView: view,
        }
      );
      const data = response.data;

      const mappedNodes: Node[] = [];
      const mappedEdges: Edge[] = [];
      let savedTopologyState: TopologyState | null = null;

      // Restore canonical state only when inventory labels are not filtering the graph.
      if (!labels || labels.length === 0) {
        try {
          const framesResponse = await apiClient.get<TopologyState>("/api/v1/topology/state", { signal, params: { ownerUserId: filters.ownerUserId || undefined }, catalogRequest: true, catalogView: view });
          const candidateState = framesResponse.data;
          if (!Array.isArray(candidateState.nodes) || !Array.isArray(candidateState.edges)) {
            throw new Error("Invalid topology state response.");
          }
          savedTopologyState = candidateState;
          candidateState.nodes.filter((frame) => frame.nodeType === "frame").forEach((frame) => {
            const safeX = (typeof frame.x === 'number' && !isNaN(frame.x)) ? frame.x : 0;
            const safeY = (typeof frame.y === 'number' && !isNaN(frame.y)) ? frame.y : 0;
            
            mappedNodes.push({
              id: frame.id,
              type: "boundaryFrame",
              position: { x: safeX, y: safeY },
              style: { width: frame.width || 400, height: frame.height || 300 },
              data: { name: frame.label || "Unknown Group" },
              zIndex: -2,
              draggable: true,
              dragHandle: '.custom-drag-handle',
            });
          });
        } catch (e) {
          console.error("Failed to fetch frames", e);
        }
      }

      const rawData = data as any;
      if ((!labels || labels.length === 0) && rawData.nodes && Array.isArray(rawData.nodes)) {
        rawData.nodes.forEach((n: any) => mappedNodes.push(n));
        rawData.edges?.forEach((e: any) => mappedEdges.push(e));
      } else if (labels && labels.length > 0) {
        // ── 3-Tier Nesting Algorithm (Khi có filter theo Label) ──
        const labelGroups = new Map<string, { labelName: string; frameId: string; servers: any[] }>();

        data.servers?.forEach((srv: any) => {
          const matchLabel = (srv.labels || []).find((l: any) =>
            labels.includes(l.key) ||
            labels.includes(l.value) ||
            labels.includes(`${l.key}:${l.value}`) ||
            labels.includes(`${l.key}=${l.value}`)
          );
          if (matchLabel) {
            const groupKey = `${matchLabel.key}=${matchLabel.value}`;
            const frameId = stableGraphUuid(`label:${groupKey}`);
            if (!labelGroups.has(groupKey)) {
              labelGroups.set(groupKey, {
                labelName: `Label: ${groupKey}`,
                frameId,
                servers: [],
              });
            }
            labelGroups.get(groupKey)!.servers.push(srv);
          }
        });

        let currentFrameY = 100;
        const START_FRAME_X = 100;

        labelGroups.forEach((group) => {
          const cols = Math.min(3, Math.max(1, group.servers.length));
          const rows = Math.ceil(group.servers.length / cols);
          const frameWidth = 400 + (cols - 1) * 340;
          const frameHeight = 320 + (rows - 1) * 220;

          // Tier 1: Boundary Frame Node
          mappedNodes.push({
            id: group.frameId,
            type: "boundaryFrame",
            position: { x: START_FRAME_X, y: currentFrameY },
            style: { width: frameWidth, height: frameHeight },
            data: { name: group.labelName },
            zIndex: -2,
            draggable: true,
            dragHandle: ".custom-drag-handle",
          });

          // Tier 2: Server Node (tọa độ tương đối bên trong Frame)
          group.servers.forEach((srv: any, srvIdx: number) => {
            const col = srvIdx % cols;
            const row = Math.floor(srvIdx / cols);
            const serverNodeId = srv.serverId || srv.id || `srv-${srvIdx}`;

            mappedNodes.push({
              id: serverNodeId,
              type: "serverNode",
              position: { x: 50 + col * 340, y: 80 + row * 220 },
              parentId: group.frameId,
              extent: "parent",
              style: { width: 300, height: 200 },
              data: {
                canEdit: srv.canEdit,
                server: {
                  serverId: serverNodeId,
                  hostname: srv.hostname,
                  ipAddress: srv.ipAddress,
                  osType: srv.osType,
                  labels: srv.labels,
                },
                width: 300,
                height: 200,
              },
              zIndex: -1,
            });

            // Tier 3: App Node (tọa độ tương đối bên trong Server)
            srv.applications?.forEach((app: any, appIdx: number) => {
              const deploymentId = app.portMappingId || app.id || `app-${appIdx}`;
              if (!hasDeploymentId(deploymentId)) return;
              mappedNodes.push({
                id: deploymentId,
                type: "appNode",
                position: { x: 40, y: 60 + appIdx * 60 },
                parentId: serverNodeId,
                extent: "parent",
                data: {
                  canEdit: app.canEdit,
                  app: {
                    id: deploymentId,
                    appId: app.appId || app.id,
                    serverId: app.serverId || serverNodeId,
                    appName: app.name || app.appName,
                    portNumber: app.port || app.portNumber,
                    protocol: app.protocol || "TCP",
                    risk: app.riskLevel || app.risk,
                    portMappingId: deploymentId,
                  },
                },
                zIndex: 0,
              });
            });
          });

          currentFrameY += frameHeight + 100;
        });

        // Map connections to ReactFlow edges
        data.connections?.forEach((conn: any, connIdx: number) => {
          mappedEdges.push({
            id: `e-${connIdx}`,
            source: conn.sourceAppId || "",
            target: conn.targetAppId || "",
            type: "floatingSmooth",
            animated: true,
            markerEnd: edgeMarker,
            style: edgeStyle,
            data: { protocol: "TCP", canEdit: conn.canEdit },
          });
        });
      } else {
        // Fallback 2-Tier bình thường khi không filter theo Label
        const MAX_COLUMNS = 3;
        const X_SPACING = 450;
        const Y_SPACING = 350;
        const START_X = 100;
        const START_Y = 100;

        data.servers?.forEach((srv: any, srvIdx: number) => {
          const col = srvIdx % MAX_COLUMNS;
          const row = Math.floor(srvIdx / MAX_COLUMNS);
          const serverNodeId = srv.serverId;

          mappedNodes.push({
            id: serverNodeId,
            type: "serverNode",
            position: { 
              x: START_X + (col * X_SPACING), 
              y: START_Y + (row * Y_SPACING) 
            },
            style: { width: 300, height: 200 },
            data: {
              canEdit: srv.canEdit,
              server: {
                serverId: srv.serverId,
                hostname: srv.hostname,
                ipAddress: srv.ipAddress,
                osType: srv.osType,
                labels: srv.labels,
              },
              width: 300,
              height: 200
            },
            zIndex: -1,
          });

          srv.applications?.forEach((app: any, appIdx: number) => {
            if (!hasDeploymentId(app.portMappingId)) return;
            mappedNodes.push({
              id: app.portMappingId,
              type: "appNode",
              position: { x: 40, y: 60 + appIdx * 60 },
              parentId: serverNodeId,
              extent: "parent",
              data: {
                canEdit: app.canEdit,
                app: {
                  id: app.portMappingId,
                  appId: app.appId,
                  serverId: app.serverId,
                  appName: app.name,
                  portNumber: app.port,
                  protocol: app.protocol,
                  risk: app.riskLevel,
                  portMappingId: app.portMappingId
                }
              },
              zIndex: 0,
            });
          });
        });

        // Map connections to ReactFlow edges
        data.connections?.forEach((conn: any, connIdx: number) => {
          mappedEdges.push({
            id: `e-${connIdx}`,
            source: conn.sourceAppId || "",
            target: conn.targetAppId || "",
            type: "floatingSmooth",
            animated: true,
            markerEnd: edgeMarker,
            style: edgeStyle,
            data: { protocol: "TCP" },
          });
        });
      }

      const exactEdges = mapDependencyGraph(data).edges.map((edge) => ({
        ...edge,
        markerEnd: edgeMarker,
        style: edgeStyle,
      }));
      const liveGraph = { nodes: mappedNodes, edges: exactEdges };
      const restored = savedTopologyState ? restoreTopologyState(savedTopologyState, liveGraph) : liveGraph;
      const editableNodeIds = new Set(restored.nodes
        .filter((node) => node.data?.canEdit === true)
        .map((node) => node.id));
      return {
        ...restored,
        edges: restored.edges.map((edge) => ({
          ...edge,
          data: {
            ...edge.data,
            canEdit: view === "mine" || (editableNodeIds.has(edge.source) && editableNodeIds.has(edge.target)),
          },
        })),
        version: savedTopologyState?.version ?? 0,
      };
    } catch (err) {
      console.error("Failed to fetch dependency map", err);
      throw err;
    }
  }, [filters.ownerUserId, view]);

  // ── Fetch graph data with useQuery ────────────────────────────────────────
  const { isLoading: isGraphLoading } = useQuery({
    queryKey: ["catalog-graph", "dependency-map", graphScopeKey, selectedEnv, selectedDatacenter, selectedLabels],
    queryFn: async ({ queryKey, signal }) => {
      const [, , requestScope, env, dc, labels] = queryKey as [string, string, string, string, string, string[]];
      const result = await fetchAndMapGraph(env, dc, labels, signal);

      if (signal.aborted || activeGraphScopeRef.current !== requestScope) {
        return result;
      }
      setNodes(result.nodes);
      setEdges(result.edges);
      topologyVersionRef.current = result.version;
      pendingChangesRef.current = emptyPendingChanges();

      return result;
    },
    enabled: view === "mine" || sharedEnabled,
  });

  // Explicitly derived loading flag that clears once data is present or queries finish
  const isLoading = (isGraphLoading || isAppsLoading) && nodes.length === 0;



  // ── Connect two nodes ──────────────────────────────────────────────────────
  const onConnect = useCallback(
    (params: Connection) => {
      if (view === "shared" && [params.source, params.target].some((id) =>
        !nodes.some((node) => node.id === id && node.data?.canEdit === true))) {
        toast.error("Both applications must be inside your Editor grant.");
        return;
      }
      const validationError = validateConnection(params, nodes, edges);
      if (validationError) {
        toast.error(validationError);
        return;
      }
      const newEdge: Edge = {
        ...params,
        id: crypto.randomUUID(),
        markerEnd: edgeMarker,
        style: edgeStyle,
        label: "TCP",
        data: { protocol: "TCP", canEdit: true },
      };
      if (isAuditor) (pendingChangesRef.current.createdEdgeIds as Set<string>).add(newEdge.id);
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [edges, isAuditor, nodes, setEdges, view],
  );

  // ── Reconnect an edge ──────────────────────────────────────────────────────
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      if (view === "shared" && (oldEdge.data?.canEdit !== true || [newConnection.source, newConnection.target].some((id) =>
        !nodes.some((node) => node.id === id && node.data?.canEdit === true)))) {
        toast.error("This connection is outside your Editor grant.");
        return;
      }
      const validationError = validateConnection(
        newConnection,
        nodes,
        edges.filter((edge) => edge.id !== oldEdge.id),
      );
      if (validationError) {
        toast.error(validationError);
        return;
      }
      setEdges((currentEdges) => currentEdges.map((edge) => {
        if (edge.id !== oldEdge.id) return edge;
        const { dependencyId, referenceId, destinationPortMappingId, destinationServerId, ...restData } = edge.data || {};
        return {
          ...edge,
          ...newConnection,
          data: Object.keys(restData).length > 0 ? restData : undefined,
        };
      }));
      if (isAuditor) (pendingChangesRef.current.changedEdgeIds as Set<string>).add(oldEdge.id);
    },
    [edges, isAuditor, nodes, setEdges, view]
  );

  // ── Drag-over canvas ───────────────────────────────────────────────────────
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // ── Drop app from palette ──────────────────────────────────────────────────
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const appId = event.dataTransfer.getData("application/reactflow");
      if (!appId) return;

      const app = availableApps.find((a) => a.id === appId);
      if (!app || !hasDeploymentId(app.portMappingId) || nodes.some((node) => node.id === app.portMappingId)) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const offsetX = 120;
      const offsetY = 22;
      const serversList = nodes.filter((n: any) => n.type === "serverNode");
      let parentId: string | undefined;
      let adjustedPosition = { x: position.x - offsetX, y: position.y - offsetY };

      for (const srv of serversList) {
        const srvData = srv.data as any;
        if (
          position.x >= srv.position.x &&
          position.x <= srv.position.x + srvData.width &&
          position.y >= srv.position.y &&
          position.y <= srv.position.y + srvData.height
        ) {
          parentId = srv.id;
          adjustedPosition = {
            x: position.x - srv.position.x - offsetX,
            y: position.y - srv.position.y - offsetY,
          };
          break;
        }
      }

      const newNode: Node = {
        id: app.portMappingId,
        type: "appNode",
        position: adjustedPosition,
        parentId,
        extent: parentId ? "parent" : undefined,
        data: { app },
      };
      setNodes((nds) => nds.concat(newNode));

      // Force a refetch of application status to remove it from the palette list
      setTimeout(() => {
        refetchApps();
      }, 200);
    },
    [reactFlowInstance, nodes, setNodes, availableApps, refetchApps],
  );

  // ── Build dependency map for a node ────────────────────────────────────────
  const getDependencies = useCallback(
    (nodeId: string, currentNodes: any[], currentEdges: any[]) => {
      const calling = currentEdges
        .filter((e: any) => e.target === nodeId)
        .map((e: any) => currentNodes.find((n: any) => n.id === e.source)?.data?.app?.appName ?? "Unknown");

      const called = currentEdges
        .filter((e: any) => e.source === nodeId)
        .map((e: any) => currentNodes.find((n: any) => n.id === e.target)?.data?.app?.appName ?? "Unknown");

      return { calling, called };
    },
    [],
  );

  // ── Selection change → update right panel ─────────────────────────────────
  const onSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }: { nodes: Node[]; edges: Edge[] }) => {
      if (selEdges.length > 0 && selNodes.length === 0) {
        const edge = selEdges[0];
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const targetNode = nodes.find((n) => n.id === edge.target);
        if (sourceNode?.type === "restricted" || targetNode?.type === "restricted") {
          setSelectedItem({ type: null, id: null }); setRightPanelData(null); return;
        }
        setSelectedItem({ type: "edge", id: edge.id });
        setRightPanelData({
          edgeData: edge.data,
          sourceApp: sourceNode?.data?.app,
          targetApp: targetNode?.data?.app,
          protocol: edge.data?.protocol,
        });
        return;
      }

      if (selNodes.length > 0) {
        const node = selNodes[0];
        if (node.type === "restricted" || node.data?.isRestricted === true) {
          setSelectedItem({ type: null, id: null }); setRightPanelData(null); return;
        }
        if (node.type === "appNode") {
          const serverNode = node.parentId
            ? nodes.find((n) => n.id === node.parentId)
            : null;
          setSelectedItem({ type: "node", id: node.id });
          setRightPanelData({
            app: (node.data as any).app,
            server: serverNode?.data?.server,
            deps: getDependencies(node.id, nodes, edges),
          });
        } else {
          setSelectedItem({ type: "server", id: node.id });
          setRightPanelData({ server: (node.data as any).server });
        }
        return;
      }

      setSelectedItem({ type: null, id: null });
      setRightPanelData(null);
    },
    [nodes, edges, getDependencies],
  );

  // ── Auto-Map from DB ──────────────────────────────────────────────────────
  const handleAutoMap = useCallback(async (overrideEnv?: string) => {
    isExplicitFetchRef.current = true;
    
    // Step 1: UI Sync & Normalization
    let targetEnv = selectedEnv;
    if (overrideEnv) {
      // "production" -> "Production"
      const normalizedEnv = overrideEnv.charAt(0).toUpperCase() + overrideEnv.slice(1).toLowerCase();
      setSelectedEnv(normalizedEnv);
      targetEnv = normalizedEnv;
    }

    // Step 2: API Fetch with Race Condition Prevention
    // We explicitly invalidate the query with the specific key we want to fetch
    // This ensures React Query starts the fetch for the correct environment immediately
    await queryClient.invalidateQueries({ 
      queryKey: ["catalog-graph", "dependency-map", graphScopeKey, targetEnv, selectedDatacenter, selectedLabels]
    });

    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
      isExplicitFetchRef.current = false;
    }, 500);
  }, [queryClient, reactFlowInstance, selectedEnv, selectedDatacenter, selectedLabels, graphScopeKey]);
  const handleSaveNetworkState = useCallback(async () => {
    if (!requireCompleteGraph()) return;
    if (!canEditGraph) {
      toast.error("You only have Viewer access to this graph.");
      return;
    }
    setIsSyncing(true);
    try {
      if (isAuditor) {
        const batch = buildTopologyCommandBatch(
          topologyVersionRef.current,
          pendingChangesRef.current,
          nodes,
          edges,
        );
        if (batch.operations.length === 0) {
          toast.info("No scoped graph changes to save.");
          return;
        }
        const response = await apiClient.post<{ version: number }>("/api/v1/topology/commands", batch, { catalogRequest: true, catalogView: view });
        topologyVersionRef.current = response.data.version;
        pendingChangesRef.current = emptyPendingChanges();
        await queryClient.invalidateQueries({
          queryKey: ["catalog-graph", "dependency-map", graphScopeKey, selectedEnv, selectedDatacenter, selectedLabels],
        });
      } else {
        const request: SaveTopologyState = {
          ...toTopologyState(nodes, edges, topologyVersionRef.current),
          ...buildDependencySyncRequest(nodes, edges),
          version: topologyVersionRef.current,
        };
        await apiClient.put("/api/v1/topology/state", request, { catalogRequest: true, catalogView: view });
        topologyVersionRef.current += 1;
      }
      toast.success("Network state saved successfully!");
    } catch (error: any) {
      console.error("Failed to save network state", error);
      if (error?.response?.status === 409) {
        pendingChangesRef.current = emptyPendingChanges();
        await queryClient.invalidateQueries({
          queryKey: ["catalog-graph", "dependency-map", graphScopeKey, selectedEnv, selectedDatacenter, selectedLabels],
        });
        toast.error("The graph changed. Latest state was reloaded; please retry your edit.");
      } else {
        toast.error("Failed to save network state.");
      }
    } finally {
      setIsSyncing(false);
    }
  }, [canEditGraph, edges, isAuditor, nodes, queryClient, requireCompleteGraph, selectedDatacenter, selectedEnv, selectedLabels, graphScopeKey, view]);

  return {
    nodes,
    setNodes,
    edges,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDrop,
    onDragOver,
    onSelectionChange,
    isLoading,
    availableApps,
    isAppsLoading,
    selectedItem,
    setSelectedItem,
    rightPanelData,
    setRightPanelData,
    selectedEnv,
    setSelectedEnv,
    selectedDatacenter,
    setSelectedDatacenter,
    selectedLabels,
    setSelectedLabels,
    handleAutoMap,
    drawingMode,
    setDrawingMode,
    canDrawServer,
    drawBox,
    onPaneMouseDown,
    onPaneMouseMove,
    onPaneMouseUp,
    handleSaveNetworkState,
    onReconnect,
    handleSync,
    isSyncing,
    exportGroupAuditMatrix,
    addGroupBox,
    addBoundaryFrame,
    onNodeDragStop,
    canEditGraph,
    canCreateGraphStructure,
  };
}

