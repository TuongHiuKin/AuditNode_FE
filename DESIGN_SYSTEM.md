# 🎨 Precision Technical Dark — Design System

Đây là tài liệu quy định về Design System cho dự án AuditNode.Frontend. Design System này được tối ưu hóa cho "Dark-only infrastructure tool", tập trung vào độ chính xác, tương phản cao, và phong cách công nghệ (technical).

## 🧭 Nguyên tắc cốt lõi
1. **Semantic Tokens là Source of Truth**: KHÔNG SỬ DỤNG mã màu hex hardcoded trong components. Luôn sử dụng các semantic classes của Tailwind (vd: `bg-surface`, `text-primary`, `border-border`).
2. **OKLCH Color Space**: Toàn bộ hệ thống màu được định nghĩa bằng `oklch` để đảm bảo độ chính xác của độ sáng (lightness) và sắc độ (chroma) trên các màn hình khác nhau, đặc biệt hữu ích cho dark mode.
3. **Màu nhấn tối giản**: Rose/Red (`#e5435f` / `var(--primary)`) là màu nhấn duy nhất, chỉ dùng cho các trạng thái cần chú ý cao, cảnh báo, hoặc các hành động chính (active states).

## 🔠 Typography
Hệ thống sử dụng 3 font chữ chuyên biệt:
*   **Sora** (`font-display`): Dùng cho Headings (H1, H2, H3), logo. Mang lại cảm giác hiện đại, đậm chất tech.
*   **Manrope** (`font-body`): Dùng cho Body text (đoạn văn, bảng biểu, UI cơ bản). Rất rõ ràng ở kích thước nhỏ.
*   **JetBrains Mono** (`font-label`, `font-mono`): Dùng cho Technical data (IP, Port, ID, Status, Protocol, table headers). Giúp các con số và mã kĩ thuật dễ đọc, thẳng hàng.

## 🎨 Semantic Colors (Surfaces & Text)

### Surfaces (Các lớp nền)
*   `bg-background`: Lớp nền sâu nhất, dùng cho nền chính của ứng dụng.
*   `bg-panel`: Dùng cho các structural panels như Sidebar.
*   `bg-surface`: Dùng cho các thẻ (Cards), ngăn kéo (Drawers), hộp thoại (Modals), Dropdowns. Lớp nền nổi lên trên background.
*   `bg-surface-hover`: Dùng cho trạng thái hover của các interactive surface (như table row, menu item).

### Text (Văn bản)
*   `text-foreground`: Màu chữ chính (sáng, độ tương phản cao).
*   `text-muted-foreground`: Màu chữ phụ (xám mờ hơn), dùng cho mô tả, subtitle, meta data.

## 🚦 Trạng thái & Trực quan (Semantic Status)
*   `text-success` / `bg-success`: Xanh lá (emerald). Healthy, online, pass.
*   `text-warning` / `bg-warning`: Vàng (amber). Caution, degraded.
*   `text-danger` / `bg-danger` (cũng là `primary`): Đỏ/Hồng (rose). Critical, error, destructive.

*Lưu ý ngoại lệ*: Trong một số trường hợp cụ thể như Protocol badges trong `TopologyAppCard.tsx` hoặc `ZoneNode.tsx`, việc sử dụng hardcoded tailwind colors (ví dụ: `text-emerald-400`, `text-violet-400`) là **intentional design** (thiết kế có chủ ý) để phân biệt các loại dữ liệu kỹ thuật khác nhau, không vi phạm quy tắc 1.

## 📐 Spacing & Radius
*   Radius: `rounded-lg` (12px) là kích thước chuẩn cho đa số elements. `rounded-xl` (18px) cho các blocks lớn hơn. `rounded-sm` (4px) cho badges.
*   Borders: Luôn dùng `border-border` cho các đường phân chia cấu trúc. Tránh dùng border quá sáng.

## ✨ Hiệu ứng & Animation
*   **Shadows**: Dùng shadow kết hợp với màu oklch. Glow effect thường dùng màu primary (vd: `shadow-[0_0_15px_rgba(229,67,95,0.2)]`).
*   **Transitions**: Luôn áp dụng `transition-colors`, `transition-all` kết hợp `duration-200` (hoặc `300`) và `ease-in-out` / `ease-out` cho hover states để tạo cảm giác mượt mà, "fluid".
*   **Keyframes**: Sử dụng các keyframes chuẩn như `fadeSlideIn`, `exportModalIn`, `pulse-glow`, `subtle-float` (đã định nghĩa trong `theme.css`).

## 🛠 Shadcn UI Compatibility
Toàn bộ hệ thống token đã được map với cấu trúc CSS variables của `shadcn/ui` (vd: `--card`, `--popover`, `--muted`). Khi copy code từ `shadcn/ui`, các component sẽ tự động thích ứng với "Precision Technical Dark" theme mà không cần chỉnh sửa style thủ công.
