# AuditNode.Frontend — Project Rules

## Ngữ cảnh Dự án
- **Hệ thống:** Infrastructure Audit & Dependency Management (Frontend).
- **Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS 4, XYFlow (React Flow), React Query (TanStack Query), Keycloak (OIDC/PKCE).
- **Kiến trúc:** FSD-Lite (Feature-Sliced Design).
- **Design System:** Tokyo Midnight (Flat, No Gradient). Xem chi tiết tại `design.md`.

## Quy tắc Chung
- Dự án này kế thừa các luật toàn cục từ `F:\Project\AGY_CLI\AGENTS.md` (Git Protection, TDD Contract, Anti-Regression, Continuous Documentation) thông qua file `skills.json`.
- Luôn đọc `design.md` trước khi viết hoặc sửa bất kỳ UI Component nào.
- UI Component dùng chung (Button, Dropdown, SlidePanel, DataCard) đã được tách vào `src/shared/ui/`. BẮT BUỘC import từ đó thay vì tự viết mới.

## Lệnh Dự án
- **Dev server:** `npm run dev`
- **Build:** `npm run build`
- **Type check:** `npx tsc --noEmit`
- **Test:** `npx vitest run`
- BẮT BUỘC chạy `npx tsc --noEmit` trước khi báo hoàn thành bất kỳ thay đổi nào.
