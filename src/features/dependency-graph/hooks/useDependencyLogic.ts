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
import { apiFetch } from "../../../core/api";
import { PaletteApp, SelectedItem } from "../types";

const edgeStyle = { stroke: "#3b82f6", strokeWidth: 2 };
const edgeMarker = { type: MarkerType.ArrowClosed, color: "#3b82f6" };

export function useDependencyLogic() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [paletteApps, setPaletteApps] = useState<PaletteApp[]>([]);
  const [selectedItem, setSelectedItem] = useState<SelectedItem>({ type: null, id: null });
  const [rightPanelData, setRightPanelData] = useState<any>(null);
  
  const [selectedEnv, setSelectedEnv] = useState("All");
  const [selectedDatacenter, setSelectedDatacenter] = useState("All");

  const reactFlowInstance = useReactFlow();

  // ── Fetch palette and graph data ──────────────────────────────────────────
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams({
          environment: selectedEnv,
          datacenter: selectedDatacenter,
        });

        const [graphData, appsData] = await Promise.all([
          apiFetch<{ nodes: any[]; edges: any[] }>(`/api/analytics/dependencies?${queryParams}`),
          apiFetch<PaletteApp[]>("/api/applications"),
        ]);
        
        const mappedNodes = graphData.nodes.map((n) => ({
          ...n,
          zIndex: n.type === "serverNode" ? -1 : undefined,
        }));

        const mappedEdges = graphData.edges.map((e) => ({
          ...e,
          type: "default",
          animated: true,
          markerEnd: edgeMarker,
          style: edgeStyle,
          data: { protocol: e.data?.protocol ?? e.protocol ?? "TCP" },
        }));

        setNodes(mappedNodes);
        setEdges(mappedEdges);
        setPaletteApps(appsData);
      } catch (err) {
        console.error("[useDependencyLogic] Initialization failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initData();
  }, [setNodes, setEdges, selectedEnv, selectedDatacenter]);

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
  };
}
