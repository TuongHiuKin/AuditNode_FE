# Tóm Tắt Kiến Trúc Frontend (Tech Stack Summary)

Tài liệu này tổng hợp các lựa chọn công nghệ cốt lõi và chiến lược triển khai kỹ thuật của hệ thống AuditNode Frontend, phục vụ cho việc bảo vệ đồ án và duy trì hệ thống.

## 1. Core Stack (Nền tảng cốt lõi)
- **React 18 & TypeScript**: Sử dụng mô hình component hướng chức năng (Functional Components) với hệ thống kiểu dữ liệu tĩnh mạnh mẽ, giúp giảm thiểu lỗi runtime và tăng khả năng bảo trì.
- **Vite 6**: Được chọn thay thế cho Webpack truyền thống vì:
    - **Hot Module Replacement (HMR)**: Tốc độ phản hồi cực nhanh trong quá trình phát triển nhờ cơ chế dựa trên Native ESM.
    - **Production Build**: Tối ưu hóa việc phân tách code (code-splitting) và nén chunk, giúp giảm thời gian tải trang ban đầu.
- **Tailwind CSS & Shadcn/UI**: Hệ thống styling dựa trên utility-first, giúp xây dựng giao diện nhanh chóng, nhất quán và dễ dàng tùy chỉnh theo thiết kế Figma.

## 2. ReactFlow Engine (Quản lý đồ thị phụ thuộc)
Hệ thống sử dụng thư viện **@xyflow/react** (phiên bản mới nhất của ReactFlow) để hiển thị sơ đồ phụ thuộc (Dependency Graph):
- **Canvas Implementation**: Triển khai giao diện canvas vô hạn, hỗ trợ tương tác kéo thả và kết nối giữa các node.
- **Dynamic Bézier Curves**: Các đường nối giữa Server và Application sử dụng đường cong Bézier động, tự động điều chỉnh hướng dựa trên vị trí tương đối của các node để tránh chồng chéo.
- **ServerGroupNode**: 
    - Đây là một Custom Node đặc biệt đóng vai trò là container cho các ứng dụng chạy trên Server.
    - **Tính toán Layout động**: Chiều cao của node `ServerGroupNode` được tính toán tự động dựa trên số lượng ứng dụng con bên trong (array length of children), đảm bảo ranh giới (gray dashed border) luôn bao phủ đủ nội dung mà không gây ra lỗi hiển thị.

## 3. TanStack Query (Quản lý trạng thái Server)
Hệ thống sử dụng **React Query (TanStack Query) v5** để quản lý việc gọi API và lưu trữ cache:
- **Caching Strategy**: Thiết lập mặc định một global `staleTime` là **5 phút (300,000ms)**.
- **Lợi ích**:
    - **Ngăn chặn UI Freezing**: Dữ liệu được truy xuất trực tiếp từ cache khi chuyển đổi giữa các trang (Inventory, Topology, Dependency Manager), loại bỏ hiện tượng giật lag do chờ đợi server.
    - **Tối ưu băng thông**: Giảm thiểu các cuộc gọi API nền (background calls) không cần thiết khi dữ liệu vẫn còn hiệu lực.
    - **Tự động làm mới**: Cache sẽ bị vô hiệu hóa (invalidation) khi người dùng chủ động nhấn nút "Auto-Map" hoặc thực hiện thay đổi dữ liệu.

## 4. Vitest Environment (Môi trường kiểm thử)
Hệ thống kiểm thử được xây dựng trên nền tảng **Vitest** và **React Testing Library**:
- **Polyfill ResizeObserver**: Do môi trường jsdom không hỗ trợ mặc định `ResizeObserver` (cần thiết cho ReactFlow để tính toán layout), hệ thống đã triển khai polyfill trong `src/__tests__/setup.ts`. Điều này cho phép thực hiện các xác nhận (assertions) về layout và kích thước component trong môi trường không đầu (headless).
- **Mocking Strategy**: Sử dụng Vitest spy và mock để giả lập các phản hồi từ API, đảm bảo các bài test Unit và Integration chạy độc lập, nhanh chóng và tin cậy.

---
*Cập nhật lần cuối: 22/05/2026*
