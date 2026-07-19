import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { useQuery } from "@tanstack/react-query";
import apiClient, { type Schemas } from "../../../shared/api/client";
import { API_ENDPOINTS } from "../../../config/endpoints";
import { SelectedItem } from "../types";
import type {
  TopologyAppData,
  TopologyLabelData,
  TopologyServerNodeData,
} from "../topology-types";
import { getLayoutedElements } from "../utils/layout";
import { buildTopologyNodes } from "../utils/topologyGrouping";

export function useTopologyLogic() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedItem, setSelectedItem] = useState<SelectedItem>({
    type: null,
    id: null,
  });
  const [rightPanelData, setRightPanelData] = useState<unknown>(null);
  const [selectedEnv, setSelectedEnv] = useState("Development");
  const [selectedDatacenter, setSelectedDatacenter] = useState("All");
  const [selectedLabels, setSelectedLabels] = useState<TopologyLabelData[]>([]);
  const [appSearchQuery, setAppSearchQuery] = useState("");
  const [viewportRevision, setViewportRevision] = useState(0);
  const lastLayoutSizeSignature = useRef("");

  const reactFlowInstance = useReactFlow();
  const selectedLabelIds = useMemo(
    () => selectedLabels.map((label) => label.id),
    [selectedLabels],
  );
  const performLayout = useCallback(
    (currentNodes: Node[], currentEdges: Edge[]) =>
      getLayoutedElements(currentNodes, currentEdges, "TB"),
    [],
  );

  useEffect(() => {
    if (viewportRevision === 0) return;

    const timerId = window.setTimeout(() => {
      void reactFlowInstance.fitView({
        padding: 0.18,
        duration: 450,
        minZoom: 0.1,
        maxZoom: 1.2,
      });
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [reactFlowInstance, viewportRevision]);

  useEffect(() => {
    if (nodes.length === 0) return;

    setNodes((currentNodes) => {
      const query = appSearchQuery.toLowerCase().trim();

      if (!query) {
        return currentNodes.map((node) => ({
          ...node,
          style: { ...node.style, opacity: 1, filter: "none" },
        }));
      }

      const isAppMatch = (app: TopologyAppData) =>
        app.appName.toLowerCase().includes(query) ||
        app.portNumber.toString().includes(query);

      const matchedEntityIds = new Set<string>();
      currentNodes.forEach((node) => {
        if (node.type !== "topologyServerNode") return;

        const data = node.data as TopologyServerNodeData;
        const isDirectMatch =
          data.server.hostname.toLowerCase().includes(query) ||
          data.server.ipAddress.toLowerCase().includes(query) ||
          data.labels.some(
            (label) =>
              label.key.toLowerCase().includes(query) ||
              label.value.toLowerCase().includes(query),
          );

        if (isDirectMatch || data.apps.some(isAppMatch)) {
          matchedEntityIds.add(data.entityId);
        }
      });

      return currentNodes.map((node) => {
        if (node.type !== "topologyServerNode") return node;

        const data = node.data as TopologyServerNodeData;
        const hasMatch = matchedEntityIds.has(data.entityId);
        return {
          ...node,
          style: {
            ...node.style,
            opacity: hasMatch ? 1 : 0.3,
            filter: hasMatch
              ? "brightness(1.1) drop-shadow(0 0 8px rgba(255, 77, 126, 0.25))"
              : "grayscale(0.6)",
          },
        };
      });
    });
  }, [appSearchQuery, nodes.length, setNodes]);

  useEffect(() => {
    const handleAppDblClick = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      setSelectedItem({ type: "node", id: detail.app.id });
      setRightPanelData({
        app: detail.app,
        server: detail.server,
      });
    };

    window.addEventListener("topology-app-dblclick", handleAppDblClick);
    return () => window.removeEventListener("topology-app-dblclick", handleAppDblClick);
  }, []);

  useEffect(() => {
    const handleLoadExternal = async (event: Event) => {
      const { serverId } = (event as CustomEvent<{ serverId: string }>).detail;
      try {
        const response = await apiClient.get<Schemas["ServerNodeDto"][]>(
          API_ENDPOINTS.TOPOLOGY.EXTERNAL_DEPENDENCIES(serverId),
          {
            params: {
              labelIds: selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
            },
            paramsSerializer: { indexes: null },
          },
        );

        const currentNodes = reactFlowInstance.getNodes();
        const newNodes = [...currentNodes];
        response.data.forEach((server) => {
          if (!server.id) return;

          const ghostId = `ghost-${server.id}`;
          if (newNodes.some((node) => node.id === ghostId)) return;

          const ghostNode = buildTopologyNodes([server], [])[0];
          if (!ghostNode) return;

          newNodes.push({
            ...ghostNode,
            id: ghostId,
            data: {
              ...ghostNode.data,
              isGhost: true,
            },
          });
        });

        const { nodes: layouted } = await performLayout(newNodes, edges);
        setNodes(layouted);
        setViewportRevision((revision) => revision + 1);
      } catch (error: unknown) {
        console.error("Failed to load external dependencies", error);
      }
    };

    window.addEventListener("topology-load-external", handleLoadExternal);
    return () => window.removeEventListener("topology-load-external", handleLoadExternal);
  }, [
    edges,
    performLayout,
    reactFlowInstance,
    selectedLabelIds,
    setNodes,
  ]);

  const serverSizeSignature = useMemo(
    () =>
      nodes
        .filter((node) => node.type === "topologyServerNode")
        .map((node) => {
          const data = node.data as TopologyServerNodeData;
          return `${node.id}:${data.width}x${data.height}`;
        })
        .join("|"),
    [nodes],
  );

  useEffect(() => {
    if (
      !serverSizeSignature ||
      lastLayoutSizeSignature.current === serverSizeSignature
    ) {
      return;
    }

    lastLayoutSizeSignature.current = serverSizeSignature;
    let cancelled = false;
    void performLayout(nodes, edges).then(
      ({ nodes: layoutedNodes }) => {
        if (!cancelled) setNodes(layoutedNodes);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [
    edges,
    nodes,
    performLayout,
    serverSizeSignature,
    setNodes,
  ]);

  const { isLoading: isGraphLoading, refetch } = useQuery({
    queryKey: [
      "topology-inventory-map",
      selectedEnv,
      selectedDatacenter,
      selectedLabelIds,
    ],
    staleTime: 0,
    queryFn: async () => {
      try {
        const response = await apiClient.get<Schemas["DependencyMapDto"]>(
          API_ENDPOINTS.TOPOLOGY.MAP,
          {
            params: {
              environment: selectedEnv === "All" ? undefined : selectedEnv,
              datacenterId:
                selectedDatacenter === "All" ? undefined : selectedDatacenter,
              labelIds:
                selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
            },
            paramsSerializer: { indexes: null },
          },
        );

        const mappedNodes = buildTopologyNodes(
          response.data.servers ?? [],
          selectedLabels,
        );
        const mappedEdges: Edge[] = [];
        const {
          nodes: layoutedNodes,
          edges: layoutedEdges,
        } = await performLayout(mappedNodes, mappedEdges);

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        setViewportRevision((revision) => revision + 1);
        return { nodes: layoutedNodes, edges: layoutedEdges };
      } catch (error: unknown) {
        console.error("Failed to fetch topology inventory", error);
        throw error;
      }
    },
  });

  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type !== "topologyServerNode") return;

      const data = node.data as TopologyServerNodeData;
      setSelectedItem({ type: "server", id: data.entityId });
      setRightPanelData({ server: data.server });
    },
    [],
  );

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      if (selectedNodes.length === 0) {
        setSelectedItem({ type: null, id: null });
        setRightPanelData(null);
      }
    },
    [],
  );

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
