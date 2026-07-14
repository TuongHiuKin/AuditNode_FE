import ELK from 'elkjs/lib/elk.bundled.js';
import { Node, Edge } from '@xyflow/react';

const elk = new ELK();

export const getLayoutedElements = async (nodes: Node[], edges: Edge[], dir = 'TB') => {
  const isHorizontal = dir === 'LR';
  
  const graph: any = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': dir,
      'elk.layered.spacing.nodeNodeBetweenLayers': '100',
      'elk.spacing.nodeNode': '80',
      'elk.padding': '[top=50,left=50,bottom=50,right=50]'
    },
    children: nodes.map(n => ({
      ...n,
      width: n.data?.width || 280,
      height: n.data?.height || 80,
    })),
    edges: edges.map(e => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target]
    }))
  };

  // Extract groups and nest children for ELK
  const groups = graph.children.filter((n: any) => n.type === 'groupNode');
  const nonGroups = graph.children.filter((n: any) => n.type !== 'groupNode');
  
  if (groups.length > 0) {
    groups.forEach((g: any) => {
      g.children = nonGroups.filter((n: any) => n.parentId === g.id);
    });
    const rootChildren = nonGroups.filter((n: any) => !n.parentId);
    graph.children = [...groups, ...rootChildren];
  }

  const layoutedGraph = await elk.layout(graph);
  
  const flattenedNodes: any[] = [];
  
  const processNode = (elkNode: any, offset = { x: 0, y: 0 }) => {
    flattenedNodes.push({
      ...elkNode,
      position: { x: elkNode.x, y: elkNode.y }
    });
    
    if (elkNode.children) {
      elkNode.children.forEach((c: any) => processNode(c, { x: 0, y: 0 }));
    }
  };
  
  layoutedGraph.children?.forEach((c: any) => processNode(c));

  // Map back to React Flow format
  const finalNodes = flattenedNodes.map(fn => {
    const originalNode = nodes.find(n => n.id === fn.id)!;
    return {
      ...originalNode,
      position: { x: fn.x, y: fn.y },
      style: { ...originalNode.style, width: fn.width, height: fn.height }
    };
  });

  return { nodes: finalNodes, edges };
};
