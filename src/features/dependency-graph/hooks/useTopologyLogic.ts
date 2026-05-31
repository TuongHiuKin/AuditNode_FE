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

  const reactFlowInstance = useReactFlow();

  // ── Auto-Layout Logic ──────────────────────────────────────────────────
  const performLayout = useCallback((currentNodes: Node[]) => {
    const servers = currentNodes.filter(n => n.type === "topologyServerNode");
    const apps = currentNodes.filter(n => n.type === "topologyAppNode");

    const GRID_GAP = 60;
    const COLUMNS = 3;
    let currentRowHeight = 0;
    let currentX = 0;
    let currentY = 0;

    const layoutedServers = servers.map((srv, index) => {
      const data = srv.data as any;
      const width = data.isExpanded ? 420 : 240;
      const height = data.isExpanded ? 320 : 90;

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

    const layoutedApps = apps.map(app => {
      const parent = layoutedServers.find(s => s.id === app.parentId);
      if (parent && (parent.data as any).isExpanded) {
        const siblingApps = apps.filter(a => a.parentId === parent.id);
        const appIndex = siblingApps.indexOf(app);
        const appCol = appIndex % 2;
        const appRow = Math.floor(appIndex / 2);
        
        return {
          ...app,
          position: { x: 30 + appCol * 190, y: 80 + appRow * 75 },
          hidden: false
        };
      }
      return { ...app, hidden: true };
    });

    return [...layoutedServers, ...layoutedApps];
  }, []);

  // Re-layout when nodes change (expansion toggle)
  useEffect(() => {
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
        const mappedEdges: Edge[] = []; // No edges for Topology view as per requirements

        data.servers?.forEach((srv: any, srvIdx: number) => {
          const serverNodeId = srv.id || `srv-${srvIdx}`;
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
              appCount: srv.applications?.length || 0,
              isExpanded: false,
              width: 240,
              height: 90
            },
            zIndex: -1,
          });

          srv.applications?.forEach((app: any, appIdx: number) => {
            mappedNodes.push({
              id: app.id || `app-${appIdx}`,
              type: "topologyAppNode",
              position: { x: 0, y: 0 },
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

        const layoutedNodes = performLayout(mappedNodes);
        setNodes(layoutedNodes);
        setEdges(mappedEdges); // Always empty array for Topology
        return { nodes: layoutedNodes, edges: mappedEdges };
      } catch (err) {
        console.error("Failed to fetch topology inventory", err);
        throw err;
      }
    },
  });

  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.type === "topologyAppNode") {
      const serverNode = node.parentId ? nodes.find((n) => n.id === node.parentId) : null;
      setSelectedItem({ type: "node", id: node.id });
      setRightPanelData({
        app: (node.data as any).app,
        server: serverNode?.data?.server,
      });
    } else if (node.type === "topologyServerNode") {
      setSelectedItem({ type: "server", id: node.id });
      setRightPanelData({ server: (node.data as any).server });
    }
  }, [nodes]);

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
  };
}
