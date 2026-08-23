import { useState, useCallback } from "react";
import {
  BaseEdge,
  getSmoothStepPath,
  getStraightPath,
  EdgeProps,
  useInternalNode,
  EdgeLabelRenderer,
  useReactFlow,
  Position,
} from '@xyflow/react';
import { X } from "lucide-react";
import { getEdgeParams } from '../utils/floatingEdgeUtils';

export function FloatingSmoothStepEdge({
  id,
  source,
  target,
  markerEnd,
  style,
  data,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode);

  // Khi 2 node nằm thẳng đứng (Top↔Bottom), dùng đường thẳng để tránh
  // path bị vẽ vòng ra ngoài ServerGroupNode container gây rối mắt.
  const isVerticalDirect =
    (sourcePos === Position.Top && targetPos === Position.Bottom) ||
    (sourcePos === Position.Bottom && targetPos === Position.Top);

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (isVerticalDirect) {
    [edgePath, labelX, labelY] = getStraightPath({
      sourceX: sx,
      sourceY: sy,
      targetX: tx,
      targetY: ty,
    });
  } else {
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX: sx,
      sourceY: sy,
      sourcePosition: sourcePos,
      targetX: tx,
      targetY: ty,
      targetPosition: targetPos,
      borderRadius: 16,
    });
  }

  const onEdgeClick = useCallback((evt: React.MouseEvent) => {
    evt.stopPropagation();
    if (data?.readOnly) return;
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  }, [data?.readOnly, id, setEdges]);

  return (
    <>
      <g
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <BaseEdge 
          id={id} 
          path={edgePath} 
          markerEnd={markerEnd} 
          style={{
            ...style,
            strokeDasharray: '5,5',
          }} 
          interactionWidth={20}
        />
      </g>
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
          className={`nodrag nopan ${
            isHovered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {!data?.readOnly && <button
            onClick={onEdgeClick}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground shadow-md transition-all hover:bg-danger hover:text-foreground hover:border-danger active:scale-90 pointer-events-auto"
            title="Remove Connection"
          >
            <X size={10} strokeWidth={3} />
          </button>}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
