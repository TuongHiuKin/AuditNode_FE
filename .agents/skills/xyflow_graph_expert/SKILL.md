---
name: xyflow_graph_expert
description: Kích hoạt khi thao tác, sửa đổi hoặc thêm tính năng liên quan đến đồ thị, bản đồ topology, Dependency Manager (XYFlow, React Flow).
---
# XYFlow Graph Expert Guardrails

## Các file quan trọng (Đọc trước khi sửa)
- `src/features/dependency-graph/components/FlowCanvas.tsx` — Canvas chính chứa `<ReactFlow>`.
- `src/features/dependency-graph/components/AppNode.tsx` — Custom Node cho Application.
- `src/features/dependency-graph/components/ServerNode.tsx` — Custom Node cho Server.
- `src/features/dependency-graph/components/ServerGroupNode.tsx` — Container Node nhóm Server.
- `src/features/dependency-graph/components/ZoneNode.tsx` — Zone/Group lớn nhất.
- `src/features/dependency-graph/components/FloatingSmoothStepEdge.tsx` — Custom Edge với thuật toán Dynamic Intersection.
- `src/features/dependency-graph/hooks/` — Các hook quản lý state đồ thị.
- `src/features/dependency-graph/utils/` — Hàm tính toán layout, grid.

## Ràng buộc
1. Luôn sử dụng hook `useNodesState` và `useEdgesState` từ `@xyflow/react`.
2. Giữ nguyên thuật toán "Dynamic Intersection Algorithm" trong `FloatingSmoothStepEdge.tsx` và logic thả lưới 2D Grid Layout.
3. Không được làm đứt logic các "connect-anywhere handles" vô hình của Custom Nodes.
4. BẮT BUỘC chạy `npx tsc --noEmit` sau khi sửa đổi bất kỳ file nào trong `dependency-graph/`.
5. Nếu thêm Custom Node mới, phải đăng ký trong `nodeTypes` object ở `FlowCanvas.tsx`.
