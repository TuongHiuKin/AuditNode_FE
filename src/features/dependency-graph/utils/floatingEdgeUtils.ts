import { Position, type InternalNode } from '@xyflow/react';

// returns the position (top,right,bottom or left) of the node based on the intersection point
function getEdgePosition(node: InternalNode, intersectionPoint: { x: number; y: number }) {
  const n = { ...node.internals.positionAbsolute, ...node };
  const nx = Math.round(n.x!);
  const ny = Math.round(n.y!);
  const px = Math.round(intersectionPoint.x);
  const py = Math.round(intersectionPoint.y);

  if (px <= nx + 1) return Position.Left;
  if (px >= nx + (n.measured.width ?? 0) - 1) return Position.Right;
  if (py <= ny + 1) return Position.Top;
  if (py >= ny + (n.measured.height ?? 0) - 1) return Position.Bottom;

  return Position.Top;
}

// returns the intersection point of a line between two node centers and the target node's border
function getNodeIntersection(intersectionNode: InternalNode, targetNode: InternalNode) {
  const {
    width: intersectionNodeWidth,
    height: intersectionNodeHeight,
  } = intersectionNode.measured;
  const intersectionNodePos = intersectionNode.internals.positionAbsolute;
  const targetNodePos = targetNode.internals.positionAbsolute;

  const w = (intersectionNodeWidth ?? 0) / 2;
  const h = (intersectionNodeHeight ?? 0) / 2;

  const x2 = intersectionNodePos.x + w;
  const y2 = intersectionNodePos.y + h;
  const x1 = targetNodePos.x + (targetNode.measured.width ?? 0) / 2;
  const y1 = targetNodePos.y + (targetNode.measured.height ?? 0) / 2;

  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return { x: x2, y: y2 };
  }

  const slope = dy / dx;
  const absSlope = Math.abs(slope);
  const nodeRatio = h / w;

  let x, y;

  if (absSlope > nodeRatio) {
    y = y2 - Math.sign(dy) * h;
    x = x2 - (Math.sign(dy) * h) / slope;
  } else {
    x = x2 - Math.sign(dx) * w;
    y = y2 - Math.sign(dx) * w * slope;
  }

  return { x, y };
}

// returns the parameters (sx, sy, tx, ty, sourcePos, targetPos) for a floating edge
export function getEdgeParams(source: InternalNode, target: InternalNode) {
  const sourceIntersectionPoint = getNodeIntersection(source, target);
  const targetIntersectionPoint = getNodeIntersection(target, source);

  const sourcePos = getEdgePosition(source, sourceIntersectionPoint);
  const targetPos = getEdgePosition(target, targetIntersectionPoint);

  return {
    sx: sourceIntersectionPoint.x,
    sy: sourceIntersectionPoint.y,
    tx: targetIntersectionPoint.x,
    ty: targetIntersectionPoint.y,
    sourcePos,
    targetPos,
  };
}
