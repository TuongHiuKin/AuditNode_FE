import { useState, useEffect, useCallback, useRef } from "react";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  reconnectEdge,
  useReactFlow,
  MarkerType,
  type Node,
  type InternalNode,
  type Edge,
  type Connection,
  applyNodeChanges,
  type NodeChange
} from "@xyflow/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient, { Schemas } from "../../../shared/api/client";
import { PaletteApp, SelectedItem } from "../types";
import { useAppPalette } from "./useAppPalette";
import { toast } from "sonner";
import * as XLSX from "xlsx";


const edgeStyle = { stroke: "#3b82f6", strokeWidth: 2 };
const edgeMarker = { type: MarkerType.ArrowClosed, color: "#3b82f6" };

export function useDependencyLogic() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { availableApps, isLoading: isAppsLoading, refetch: refetchApps } = useAppPalette();
  const [selectedItem, setSelectedItem] = useState<SelectedItem>({ type: null, id: null });
  const [rightPanelData, setRightPanelData] = useState<any>(null);

  const [selectedEnv, setSelectedEnv] = useState("Development");
  const [selectedDatacenter, setSelectedDatacenter] = useState("All");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  const [isSyncing, setIsSyncing] = useState(false);

  const reactFlowInstance = useReactFlow();
  const queryClient = useQueryClient();

  const isExplicitFetchRef = useRef(false);
  const hasMountedRef = useRef(false);

  // ── Scoped Export Algorithm ─────────────────────────────────────────────


  const exportGroupAuditMatrix = useCallback((groupId: string, groupLabel: string) => {
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
      
      return {
        "Source Component": (sourceNode?.data as any)?.app?.appName || (sourceNode?.data as any)?.server?.hostname || "Unknown",
        "Source IP": (sourceNode?.data as any)?.server?.ipAddress || "Internal",
        "Target Component": (targetNode?.data as any)?.app?.appName || (targetNode?.data as any)?.server?.hostname || "Unknown",
        "Target IP": (targetNode?.data as any)?.server?.ipAddress || "Internal",
        "Port": (targetNode?.data as any)?.app?.portNumber || edge.data?.protocol || "Any",
        "Protocol": edge.data?.protocol || "TCP",
        "Workspace": "Global"
      };
    });

    if (auditData.length === 0) {
      toast.error("No connections found within this group to export.");
      return;
    }

    // 4. Client-side XLSX Generation
    const ws = XLSX.utils.json_to_sheet(auditData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audit Matrix");

    const date = new Date().toISOString().split('T')[0];
    const cleanGroupLabel = groupLabel.replace(/\s+/g, '_');
    const workspaceName = "Global";
    
    XLSX.writeFile(wb, `${workspaceName}_${cleanGroupLabel}_AuditMatrix_${date}.xlsx`);
    toast.success(`Exported ${auditData.length} connections for ${groupLabel}`);
  }, [nodes, edges]);

  const checkEmptyFrame = useCallback((type: 'groupNode') => {
    const hasEmpty = nodes.some(n => {
      if (n.type !== type) return false;
      return !nodes.some(child => child.parentId === n.id);
    });
    if (hasEmpty) {
      toast.error(`Vui lòng sử dụng Group Box rỗng hiện tại trước khi tạo mới!`);
      return true;
    }
    return false;
  }, [nodes]);

  const addGroupBox = useCallback(() => {
    if (checkEmptyFrame('groupNode')) return;
    setDrawingMode('groupBox');
    toast.info("Vẽ một khung trên màn hình để tạo Group");
  }, [checkEmptyFrame]);

  const onNodeDragStop = useCallback(
    async (_: React.MouseEvent, node: Node) => {
      if (node.type === "boundaryFrame") return;

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
    [nodes, setNodes]
  );


  // ── Sync to Database ─────────────────────────────────────────────────────
  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const currentEdges = reactFlowInstance.getEdges();
      
      const dependencies = currentEdges.map((edge) => {
        // Extract real Application ID from composite (e.g., app-123-srv-456)
        const extractAppId = (nodeId: string) => {
          // Robust regex to extract the ID between 'app-' and '-srv-'
          // This handles UUIDs with dashes correctly
          const compositeMatch = nodeId.match(/^app-(.+)-srv-.+$/);
          if (compositeMatch) {
            return compositeMatch[1];
          }
          
          // Fallback: If it's a new node (e.g., n-timestamp), get the real ID from node data
          const node = reactFlowInstance.getNode(nodeId);
          if (node?.type === "appNode") {
            return (node.data as any).app?.id || nodeId;
          }
          
          return nodeId;
        };

        return {
          sourceAppId: extractAppId(edge.source),
          destAppId: extractAppId(edge.target),
          destPortId: (reactFlowInstance.getNode(edge.target)?.data as any)?.app?.portMappingId
        };
      });

      await apiClient.put("/api/v1/dependencies/sync", { dependencies });
      
      toast.success("Network state synchronized successfully");
      
      // Reset edge animations/colors to "saved" state by refetching
      await queryClient.invalidateQueries({ queryKey: ["dependency-map"] });
    } catch (error: any) {
      console.error("Sync failed:", error);
      toast.error(error.response?.data?.message || "Failed to synchronize network state");
    } finally {
      setIsSyncing(false);
    }
  }, [reactFlowInstance, queryClient]);

  // ── Fetch all servers to determine mapping status ────────────────────────
  const { data: allServers = [] } = useQuery<Schemas["ServerResponseDto"][]>({
    queryKey: ["all-servers"],
    queryFn: async () => {
      const response = await apiClient.get<Schemas["ServerResponseDto"][]>("/api/v1/servers");
      const rawResponse = response as any;
      const data = Array.isArray(rawResponse.data) ? rawResponse.data : (rawResponse.data?.data || []);
      return data as Schemas["ServerResponseDto"][];
    },
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
        const id = `group-${Date.now()}`;
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
        const id = `frame-${Date.now()}`;
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
  const fetchAndMapGraph = useCallback(async (env: string, dc: string) => {
    try {
      const response = await apiClient.get<Schemas["DependencyMapDto"]>(
        "/api/v1/topology/map",
        {
          params: {
            environment: env === "All" ? undefined : env,
            datacenterId: dc === "All" ? undefined : dc,
          },
        }
      );
      const data = response.data;

      const mappedNodes: Node[] = [];
      const mappedEdges: Edge[] = [];

      try {
        const framesResponse = await apiClient.get("/api/v1/frames");
        framesResponse.data.forEach((frame: any) => {
          const safeX = (typeof frame.x === 'number' && !isNaN(frame.x)) ? frame.x : 0;
          const safeY = (typeof frame.y === 'number' && !isNaN(frame.y)) ? frame.y : 0;
          
          mappedNodes.push({
            id: frame.id,
            type: "boundaryFrame",
            position: { x: safeX, y: safeY },
            style: { width: frame.width || 400, height: frame.height || 300 },
            data: { name: frame.name || "Unknown Group" },
            zIndex: -1,
            draggable: true,
            dragHandle: '.custom-drag-handle',
          });
        });
      } catch (e) {
        console.error("Failed to fetch frames", e);
      }

      // Handle ReactFlow-compatible structure directly if provided
      const rawData = data as any;
      if (rawData.nodes && Array.isArray(rawData.nodes)) {
        rawData.nodes.forEach((n: any) => mappedNodes.push(n));
        rawData.edges?.forEach((e: any) => mappedEdges.push(e));
      } else {
        // Fallback: Map servers and their nested applications to flat ReactFlow nodes
        const MAX_COLUMNS = 3;
        const X_SPACING = 450;
        const Y_SPACING = 350;
        const START_X = 100;
        const START_Y = 100;

        data.servers?.forEach((srv: any, srvIdx: number) => {
          const col = srvIdx % MAX_COLUMNS;
          const row = Math.floor(srvIdx / MAX_COLUMNS);
          const serverNodeId = srv.id || `srv-${srvIdx}`;

          mappedNodes.push({
            id: serverNodeId,
            type: "serverNode",
            position: { 
              x: START_X + (col * X_SPACING), 
              y: START_Y + (row * Y_SPACING) 
            },
            style: { width: 300, height: 200 },
            data: {
              server: {
                hostname: srv.hostname,
                ipAddress: srv.ipAddress,
                osType: srv.osType
              },
              width: 300,
              height: 200
            },
            zIndex: -1,
          });

          srv.applications?.forEach((app: any, appIdx: number) => {
            mappedNodes.push({
              id: app.id || `app-${appIdx}`,
              type: "appNode",
              position: { x: 40, y: 60 + appIdx * 60 },
              parentId: serverNodeId,
              extent: "parent",
              data: {
                app: {
                  id: app.id,
                  appName: app.name,
                  portNumber: app.port,
                  protocol: app.protocol,
                  risk: app.riskLevel,
                  portMappingId: app.portMappingId
                }
              },
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

      return { nodes: mappedNodes, edges: mappedEdges };
    } catch (err) {
      console.error("Failed to fetch dependency map", err);
      throw err;
    }
  }, []);

  // ── Fetch graph data with useQuery ────────────────────────────────────────
  const { isLoading: isGraphLoading } = useQuery({
    queryKey: ["dependency-map", selectedEnv, selectedDatacenter],
    queryFn: async ({ queryKey }) => {
      const [_key, env, dc] = queryKey as [string, string, string];
      const result = await fetchAndMapGraph(env, dc);

      const isFirstMount = !hasMountedRef.current;
      hasMountedRef.current = true;

      const cached = sessionStorage.getItem('dependencyGraphState');
      const hasDeepLink = new URLSearchParams(window.location.search).has("entityId");
      
      // Prevent background refetches from wiping local layout changes
      const shouldOverwrite = isExplicitFetchRef.current || (isFirstMount && !cached) || (isFirstMount && hasDeepLink);
      if (shouldOverwrite) {
        setNodes(result.nodes);
        setEdges(result.edges);
      }

      return result;
    },
  });

  // Explicitly derived loading flag that clears once data is present or queries finish
  const isLoading = (isGraphLoading || isAppsLoading) && nodes.length === 0;



  // ── Connect two nodes ──────────────────────────────────────────────────────
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge = {
        ...params,
        id: `e-${Date.now()}`,
        markerEnd: edgeMarker,
        style: edgeStyle,
        data: { protocol: "TCP" },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges],
  );

  // ── Reconnect an edge ──────────────────────────────────────────────────────
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
    },
    [setEdges]
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
      if (!app) return;

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

      const newNode: any = {
        id: `n-${Date.now()}`,
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
      queryKey: ["dependency-map", targetEnv, selectedDatacenter] 
    });

    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
      isExplicitFetchRef.current = false;
    }, 500);
  }, [queryClient, reactFlowInstance, selectedEnv, selectedDatacenter]);
  const handleSaveNetworkState = useCallback(async () => {
    try {
      const frames = nodes
        .filter(n => n.type === 'boundaryFrame')
        .map(n => ({
          id: n.id,
          name: n.data.name,
          x: n.position.x,
          y: n.position.y,
          width: n.style?.width,
          height: n.style?.height
        }));

      const assignments = nodes
        .filter(n => n.type !== 'boundaryFrame')
        .map(n => ({
          nodeId: n.id,
          parentFrameId: n.parentId || null
        }));

      await apiClient.post("/api/v1/topology/sync", { frames, assignments });
      toast.success("Network state saved successfully!");
    } catch (error) {
      console.error("Failed to save network state", error);
      toast.error("Failed to save network state.");
    }
  }, [nodes]);

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
  };
}

