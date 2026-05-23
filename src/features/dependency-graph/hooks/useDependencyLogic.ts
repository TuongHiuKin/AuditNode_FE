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

const edgeStyle = { stroke: "#3b82f6", strokeWidth: 2 };
const edgeMarker = { type: MarkerType.ArrowClosed, color: "#3b82f6" };

export function useDependencyLogic() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [paletteApps, setPaletteApps] = useState<PaletteApp[]>([]);
  const [selectedItem, setSelectedItem] = useState<SelectedItem>({ type: null, id: null });
  const [rightPanelData, setRightPanelData] = useState<any>(null);
  
  const [selectedEnv, setSelectedEnv] = useState("All");
  const [selectedDatacenter, setSelectedDatacenter] = useState("All");

  const reactFlowInstance = useReactFlow();
  const queryClient = useQueryClient();

  // ── Fetch graph data with useQuery ────────────────────────────────────────
  const { isLoading: isGraphLoading, isFetching: isGraphFetching } = useQuery({
    queryKey: ["dependency-map", selectedEnv, selectedDatacenter],
    queryFn: async () => {
      const response = await apiClient.get<Schemas["DependencyMapDto"]>(
        "/api/Topology/map",
        {
          params: {
            environment: selectedEnv,
            datacenterId: selectedDatacenter === "All" ? undefined : selectedDatacenter,
          },
        }
      );
      const data = response.data;
      
      const mappedNodes: Node[] = [];
      const mappedEdges: Edge[] = [];

      // Map servers and their nested applications to flat ReactFlow nodes
      data.servers?.forEach((srv, srvIdx) => {
        const serverNodeId = srv.id || `srv-${srvIdx}`;
        mappedNodes.push({
          id: serverNodeId,
          type: "serverNode",
          position: { x: srvIdx * 400, y: 0 }, // Basic layout placeholder
          data: { 
            server: { 
              hostname: srv.hostname, 
              ipAddress: srv.ipAddress,
              osType: (srv as any).osType // Use as any in case it's in payload but not in contract
            },
            width: 300,
            height: 200
          },
          zIndex: -1,
        });

        srv.applications?.forEach((app, appIdx) => {
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
      data.connections?.forEach((conn, connIdx) => {
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

      setNodes(mappedNodes);
      setEdges(mappedEdges);
      return { nodes: mappedNodes, edges: mappedEdges }; // Return the required top-level object
    },
  });

  // ── Fetch palette applications ────────────────────────────────────────────
  const { isLoading: isAppsLoading, isFetching: isAppsFetching } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const response = await apiClient.get<Schemas["ApplicationResponseDto"][]>("/api/Applications");
      const data = response.data as unknown as PaletteApp[];
      setPaletteApps(data);
      return data;
    },
  });

  // Only show initial loading state if no nodes are present
  const isLoading = (isGraphLoading || isAppsLoading) && nodes.length === 0;



  // ── Connect two nodes ──────────────────────────────────────────────────────
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
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

      const app = paletteApps.find((a) => a.id === appId);
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
    },
    [reactFlowInstance, nodes, setNodes, paletteApps],
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
    paletteApps,
    selectedItem,
    setSelectedItem,
    rightPanelData,
    setRightPanelData,
    selectedEnv,
    setSelectedEnv,
    selectedDatacenter,
    setSelectedDatacenter,
    handleAutoMap,
  };
}

