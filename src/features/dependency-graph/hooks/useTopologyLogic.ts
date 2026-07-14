import { useState, useEffect, useCallback } from "react";
import { getLayoutedElements } from "../utils/layout";
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
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
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

  // ── Fetch External Ghost Nodes ─────────────────────────────────────────
  useEffect(() => {
    const handleLoadExternal = async (e: Event) => {
      const { serverId } = (e as CustomEvent).detail;
      try {
        const response = await apiClient.get<Schemas["ServerNodeDto"][]>(
          `/api/v1/topology/nodes/${serverId}/external-dependencies`, {
            params: { labels: selectedLabels.length > 0 ? selectedLabels : undefined }
          }
        );
        const externalServers = response.data;
        
        const currentNodes = reactFlowInstance.getNodes();
        const newNodes = [...currentNodes];
        
        externalServers.forEach((srv: any, idx: number) => {
          const ghostId = `ghost-${srv.id}`;
          if (!newNodes.some(n => n.id === ghostId)) {
            const apps = (srv.applications || []).map((app: any, appIdx: number) => ({
              id: app.id || `app-${srv.id}-${appIdx}`,
              appName: app.name,
              portNumber: app.port,
              protocol: app.protocol
            }));

            newNodes.push({
              id: ghostId,
              type: "topologyServerNode",
              position: { x: 0, y: 0 },
              data: {
                server: {
                  hostname: srv.hostname,
                  ipAddress: srv.ipAddress,
                  environment: srv.environment || "PROD"
                },
                apps,
                appCount: apps.length,
                isExpanded: false,
                width: 280,
                height: 80,
                isGhost: true
              }
            });
          }
        });
        
        const { nodes: layouted } = await performLayout(newNodes, edges);
        setNodes(layouted);
        
      } catch (err) {
        console.error("Failed to load external dependencies", err);
      }
    };

    window.addEventListener("topology-load-external", handleLoadExternal);
    return () => window.removeEventListener("topology-load-external", handleLoadExternal);
  }, [selectedLabels, edges, setNodes]);

  // ── Auto-Layout Logic ──────────────────────────────────────────────────
  const performLayout = async (currentNodes: Node[], currentEdges: Edge[]) => {
    return await getLayoutedElements(currentNodes, currentEdges, 'TB');
  };

  // Re-layout when nodes change (expansion toggle)
  useEffect(() => {
    if (nodes.length === 0) return;
    
    // Only re-layout if a node's expanded state changed (this would need more logic to avoid infinite loops)
    // For now, we skip auto re-layout on expand to keep it simple, or trigger it manually.
  }, []);

  // ── Fetch graph data ──────────────────────────────────────────────────────
  const { isLoading: isGraphLoading, refetch } = useQuery({
    queryKey: ["topology-inventory-map", selectedEnv, selectedDatacenter, selectedLabels],
    staleTime: 0,
    queryFn: async () => {
      try {
        // Send labels[] param in query (using qs array format usually, but axios does this automatically with URLSearchParams)
        const response = await apiClient.get<Schemas["DependencyMapDto"]>(
          "/api/v1/topology/map",
          {
            params: {
              environment: selectedEnv === "All" ? undefined : selectedEnv,
              datacenterId: selectedDatacenter === "All" ? undefined : selectedDatacenter,
              labels: selectedLabels.length > 0 ? selectedLabels : undefined,
            },
          }
        );
        const data = response.data;

        const mappedNodes: Node[] = [];
        const mappedEdges: Edge[] = [];

        // 1. Create Group Nodes for selected labels
        if (selectedLabels.length > 0) {
          selectedLabels.forEach(label => {
            mappedNodes.push({
              id: `group-${label}`,
              type: 'groupNode',
              position: { x: 0, y: 0 },
              data: { label: `Label: ${label}` },
              style: {
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                border: '1px dashed rgba(59, 130, 246, 0.5)',
                borderRadius: '8px'
              }
            });
          });
        }

        data.servers?.forEach((srv: any, srvIdx: number) => {
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
          const srvLabels = srv.labels || [];

          const baseNodeData = {
            server: {
              hostname: srv.hostname,
              ipAddress: srv.ipAddress,
              osType: srv.osType,
              environment: srv.environment || "PROD"
            },
            apps,
            appCount,
            isExpanded: false,
            width: 280,
            height: 80
          };

          if (selectedLabels.length > 0) {
            // Find which selected labels this server has
            const matchingLabels = selectedLabels.filter(sl => srvLabels.includes(sl));
            
            // Duplicate node for each matching label
            matchingLabels.forEach(label => {
              mappedNodes.push({
                id: `${srv.id}-${label}`,
                type: "topologyServerNode",
                parentId: `group-${label}`,
                position: { x: 0, y: 0 },
                data: {
                  ...baseNodeData,
                  isDuplicated: matchingLabels.length > 1,
                  originalId: srv.id
                },
              });
            });
          } else {
            mappedNodes.push({
              id: srv.id,
              type: "topologyServerNode",
              position: { x: 0, y: 0 },
              data: baseNodeData,
            });
          }
        });

        const { nodes: layoutedNodes, edges: layoutedEdges } = await performLayout(mappedNodes, mappedEdges);
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        return { nodes: layoutedNodes, edges: layoutedEdges };
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
    selectedLabels,
    setSelectedLabels,
    appSearchQuery,
    setAppSearchQuery,
  };
}
