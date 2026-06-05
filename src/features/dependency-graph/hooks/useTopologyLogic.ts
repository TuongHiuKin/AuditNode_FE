import { useState, useEffect, useCallback } from "react";
import {
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
} from "@xyflow/react";
import { useQuery } from "@tanstack/react-query";
import apiClient, { Schemas } from "../../../shared/api/client";
import { SelectedItem } from "../types";

export function useTopologyLogic() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedItem, setSelectedItem] = useState<SelectedItem>({ type: null, id: null });
  const [rightPanelData, setRightPanelData] = useState<any>(null);

  const [selectedEnv, setSelectedEnv] = useState("Development");
  const [selectedDatacenter, setSelectedDatacenter] = useState("All");
  const [appSearchQuery, setAppSearchQuery] = useState("");

  const reactFlowInstance = useReactFlow();

  // ── Highlighting Logic based on Search ───────────────────────────────
  useEffect(() => {
    if (nodes.length === 0) return;

    setNodes((currentNodes) => {
      const query = appSearchQuery.toLowerCase().trim();
      
      if (!query) {
        // Reset styles if no query
        return currentNodes.map((node) => ({
          ...node,
          style: { ...node.style, opacity: 1, filter: "none" },
        }));
      }

      // 1. Define Matching Helpers
      const isServerDirectMatch = (node: Node) => {
        const srvData = (node.data as any).server || node.data || {};
        const hostname = (srvData.hostname || "").toLowerCase();
        const ip = (srvData.ipAddress || srvData.ip || "").toLowerCase();
        const label = (node.data as any).label?.toLowerCase() || "";
        return hostname.includes(query) || ip.includes(query) || label.includes(query);
      };

      const isAppMatch = (node: Node | any, isEmbedded = false) => {
        const appData = isEmbedded ? node : ((node.data as any).app || node.data || {});
        const name = (appData.appName || appData.name || appData.label || "").toLowerCase();
        const port = (appData.portNumber || appData.port || "").toString();
        return name.includes(query) || port.includes(query);
      };

      // 2. Identify Matched Servers (Rule B)
      const matchedServerIds = new Set<string>();
      currentNodes.forEach(node => {
        if (node.type === 'topologyServerNode' || node.type === 'serverNode') {
          // Rule B.1: Direct Match
          if (isServerDirectMatch(node)) {
            matchedServerIds.add(node.id);
            return;
          }

          // Rule B.2: Child Match (Embedded Apps)
          const apps = (node.data as any).apps || [];
          if (apps.some((app: any) => isAppMatch(app, true))) {
            matchedServerIds.add(node.id);
            return;
          }

          // Rule B.2: Child Match (Separate App Nodes)
          const hasChildMatch = currentNodes.some(child => 
            child.parentId === node.id && isAppMatch(child)
          );
          if (hasChildMatch) {
            matchedServerIds.add(node.id);
          }
        }
      });

      // 3. Apply Styling (Rule C)
      return currentNodes.map((node) => {
        // If it's a Server
        if (node.type === 'topologyServerNode' || node.type === 'serverNode') {
          const hasMatch = matchedServerIds.has(node.id);
          return {
            ...node,
            style: {
              ...node.style,
              opacity: hasMatch ? 1 : 0.3,
              filter: hasMatch 
                ? "brightness(1.1) drop-shadow(0 0 8px rgba(59, 130, 246, 0.3))" 
                : "grayscale(0.6)",
            },
          };
        }

        // If it's an Application
        if (node.type === 'appNode' || node.type === 'topologyAppNode') {
          const isDirectMatch = isAppMatch(node);
          const parentNode = node.parentId ? currentNodes.find(n => n.id === node.parentId) : null;
          const parentMatchedDirectly = parentNode && isServerDirectMatch(parentNode);

          let opacity = 1;
          if (!isDirectMatch) {
            opacity = parentMatchedDirectly ? 0.5 : 0.3;
          }

          return {
            ...node,
            style: {
              ...node.style,
              opacity,
            },
          };
        }

        return node;
      });
    });
  }, [appSearchQuery, setNodes]);

  // ── Listen for app double-click events from TopologyServerNode ────────
  useEffect(() => {
    const handleAppDblClick = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setSelectedItem({ type: "node", id: detail.app.id });
      setRightPanelData({
        app: detail.app,
        server: detail.server,
      });
    };

    window.addEventListener("topology-app-dblclick", handleAppDblClick);
    return () => window.removeEventListener("topology-app-dblclick", handleAppDblClick);
  }, []);

  // ── Auto-Layout Logic ──────────────────────────────────────────────────
  const performLayout = useCallback((currentNodes: Node[]) => {
    const servers = currentNodes.filter(n => n.type === "topologyServerNode");

    const GRID_GAP = 60;
    const COLUMNS = 3;
    let currentRowHeight = 0;
    let currentX = 0;
    let currentY = 0;

    const layoutedServers = servers.map((srv, index) => {
      const data = srv.data as any;
      const width = data.isExpanded ? (data.width || 400) : 280;
      const height = data.isExpanded ? (data.height || 200) : 80;

      if (index > 0 && index % COLUMNS === 0) {
        currentX = 0;
        currentY += currentRowHeight + GRID_GAP;
        currentRowHeight = 0;
      }

      const position = { x: currentX, y: currentY };

      currentX += width + GRID_GAP;
      currentRowHeight = Math.max(currentRowHeight, height);

      return {
        ...srv,
        position,
        data: { ...data, width, height }
      };
    });

    return layoutedServers;
  }, []);

  // Re-layout when nodes change (expansion toggle)
  useEffect(() => {
    if (nodes.length === 0) return;

    const layouted = performLayout(nodes);
    const needsUpdate = layouted.some((node, i) =>
      node.position.x !== nodes[i]?.position.x ||
      node.position.y !== nodes[i]?.position.y ||
      node.hidden !== nodes[i]?.hidden
    );

    if (needsUpdate) {
      setNodes(layouted);
    }
  }, [nodes, performLayout, setNodes]);

  // ── Fetch graph data ──────────────────────────────────────────────────────
  const { isLoading: isGraphLoading, refetch } = useQuery({
    queryKey: ["topology-inventory-map", selectedEnv, selectedDatacenter],
    staleTime: 0, // Ensure data is considered stale immediately for fresh fetches
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
        const mappedEdges: Edge[] = []; // No edges for Topology view

        data.servers?.forEach((srv: any, srvIdx: number) => {
          const serverNodeId = srv.id || `srv-${srvIdx}`;

          // Map apps data to embed directly in server node
          const apps = (srv.applications || []).map((app: any, appIdx: number) => ({
            id: app.id || `app-${srvIdx}-${appIdx}`,
            appName: app.name,
            portNumber: app.port,
            protocol: app.protocol,
            risk: app.riskLevel,
            icon: app.icon,
          }));

          const appCount = apps.length;
          const rows = Math.ceil(appCount / 2);
          const expandedHeight = Math.max(200, 100 + rows * 72 + 16);

          mappedNodes.push({
            id: serverNodeId,
            type: "topologyServerNode",
            position: { x: 0, y: 0 },
            data: {
              server: {
                hostname: srv.hostname,
                ipAddress: srv.ipAddress,
                osType: srv.osType,
                environment: srv.environment || "PROD"
              },
              apps,        // Embed apps data directly
              appCount,
              isExpanded: false,
              width: 280,
              height: 80
            },
          });
        });

        const layoutedNodes = performLayout(mappedNodes);
        setNodes(layoutedNodes);
        setEdges(mappedEdges);
        return { nodes: layoutedNodes, edges: mappedEdges };
      } catch (err) {
        console.error("Failed to fetch topology inventory", err);
        throw err;
      }
    },
  });

  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.type === "topologyServerNode") {
      setSelectedItem({ type: "server", id: node.id });
      setRightPanelData({ server: (node.data as any).server });
    }
  }, []);

  const onSelectionChange = useCallback(({ nodes: selNodes }: { nodes: Node[] }) => {
    if (selNodes.length === 0) {
      setSelectedItem({ type: null, id: null });
      setRightPanelData(null);
    }
  }, []);

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onSelectionChange,
    onNodeDoubleClick,
    refetch,
    isLoading: isGraphLoading && nodes.length === 0,
    selectedItem,
    setSelectedItem,
    rightPanelData,
    setRightPanelData,
    selectedEnv,
    setSelectedEnv,
    selectedDatacenter,
    setSelectedDatacenter,
    appSearchQuery,
    setAppSearchQuery,
  };
}
