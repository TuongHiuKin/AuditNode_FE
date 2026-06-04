import { useState, useEffect, useCallback } from "react";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient, { Schemas } from "../../../shared/api/client";
import { PaletteApp, SelectedItem } from "../types";
import { useAppPalette } from "./useAppPalette";

const edgeStyle = { stroke: "#3b82f6", strokeWidth: 2 };
const edgeMarker = { type: MarkerType.ArrowClosed, color: "#3b82f6" };

export function useDependencyLogic() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { availableApps, isLoading: isAppsLoading, refetch: refetchApps } = useAppPalette();
  const [selectedItem, setSelectedItem] = useState<SelectedItem>({ type: null, id: null });
  const [rightPanelData, setRightPanelData] = useState<any>(null);

  const [selectedEnv, setSelectedEnv] = useState("Development");
  const [selectedDatacenter, setSelectedDatacenter] = useState("All");

  const reactFlowInstance = useReactFlow();
  const queryClient = useQueryClient();

  // ── Fetch all servers to determine mapping status ────────────────────────
  const { data: allServers = [] } = useQuery<Schemas["ServerResponseDto"][]>({
    queryKey: ["all-servers"],
    queryFn: async () => {
      const response = await apiClient.get<Schemas["ServerResponseDto"][]>("/api/Servers");
      const rawResponse = response as any;
      const data = Array.isArray(rawResponse.data) ? rawResponse.data : (rawResponse.data?.data || []);
      return data as Schemas["ServerResponseDto"][];
    },
  });

  const unmappedServers = allServers.filter(
    (srv: Schemas["ServerResponseDto"]) => !nodes.some((n) => n.id === srv.id && n.type === "serverNode")
  );

  const canDrawServer = unmappedServers.length > 0;

  // ── Draw to Create Server Logic ──────────────────────────────────────────
  const [isDrawingServer, setIsDrawingServer] = useState(false);
  const [drawBox, setDrawBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  const onPaneMouseDown = useCallback((event: React.MouseEvent) => {
    if (!isDrawingServer || !canDrawServer) return;

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    setDrawBox({
      startX: position.x,
      startY: position.y,
      currentX: position.x,
      currentY: position.y,
    });
  }, [isDrawingServer, canDrawServer, reactFlowInstance]);

  const onPaneMouseMove = useCallback((event: React.MouseEvent) => {
    if (!drawBox) return;

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    setDrawBox((prev) => prev ? ({
      ...prev,
      currentX: position.x,
      currentY: position.y,
    }) : null);
  }, [drawBox, reactFlowInstance]);

  const onPaneMouseUp = useCallback(() => {
    if (!drawBox) return;

    const width = Math.abs(drawBox.currentX - drawBox.startX);
    const height = Math.abs(drawBox.currentY - drawBox.startY);
    const x = Math.min(drawBox.startX, drawBox.currentX);
    const y = Math.min(drawBox.startY, drawBox.currentY);

    if (width > 50 && height > 50 && unmappedServers.length > 0) {
      const targetServer = unmappedServers[0];
      const newNode: Node = {
        id: targetServer.id!,
        type: "serverNode",
        position: { x, y },
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
    }

    setDrawBox(null);
    setIsDrawingServer(false);
  }, [drawBox, unmappedServers, setNodes]);

  // ── Fetch graph data with useQuery ────────────────────────────────────────
  const { isLoading: isGraphLoading } = useQuery({
    queryKey: ["dependency-map", selectedEnv, selectedDatacenter],
    queryFn: async () => {
      try {
        const response = await apiClient.get<Schemas["DependencyMapDto"]>(
          "/api/Topology/map",
          {
            params: {
              environment: selectedEnv === "All" ? undefined : selectedEnv,
              datacenterId: selectedDatacenter === "All" ? undefined : selectedDatacenter,
            },
          }
        );
        const data = response.data;

        const mappedNodes: Node[] = [];
        const mappedEdges: Edge[] = [];

        // Handle ReactFlow-compatible structure directly if provided
        const rawData = data as any;
        if (rawData.nodes && Array.isArray(rawData.nodes)) {
          rawData.nodes.forEach((n: any) => mappedNodes.push(n));
          rawData.edges?.forEach((e: any) => mappedEdges.push(e));
        } else {
          // Fallback: Map servers and their nested applications to flat ReactFlow nodes
          data.servers?.forEach((srv: any, srvIdx: number) => {
            const serverNodeId = srv.id || `srv-${srvIdx}`;
            mappedNodes.push({
              id: serverNodeId,
              type: "serverNode",
              position: { x: srvIdx * 400, y: 0 },
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
                    risk: app.riskLevel
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
              type: "default",
              animated: true,
              markerEnd: edgeMarker,
              style: edgeStyle,
              data: { protocol: "TCP" },
            });
          });
        }

        setNodes(mappedNodes);
        setEdges(mappedEdges);
        return { nodes: mappedNodes, edges: mappedEdges };
      } catch (err) {
        console.error("Failed to fetch dependency map", err);
        throw err;
      }
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
  const handleAutoMap = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["dependency-map"] });
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
    }, 100);
  }, [queryClient, reactFlowInstance]);


  return {
    nodes,
    edges,
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
    handleAutoMap,
    isDrawingServer,
    setIsDrawingServer,
    canDrawServer,
    drawBox,
    onPaneMouseDown,
    onPaneMouseMove,
    onPaneMouseUp,
  };
}

