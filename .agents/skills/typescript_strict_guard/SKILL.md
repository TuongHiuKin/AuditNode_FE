---
name: typescript_strict_guard
description: Kích hoạt mỗi khi tạo query mới, cập nhật API, hoặc sửa đổi luồng dữ liệu truyền từ Backend xuống Frontend.
---
# TypeScript & API Synchronization Guard

1. **Context Gathering:** Nếu Backend vừa đổi API, chạy lệnh `npm run sync-api` trước để cập nhật file `src/shared/api/v1-contract.ts`.
2. **No Guessing:** Tuyệt đối không dùng `any` hay `@ts-ignore`. Phải trích xuất đúng Type từ `v1-contract.ts`.
3. **Strict Verification:** BẮT BUỘC chạy ngầm lệnh `npx tsc --noEmit` hoặc `npm run build`. Nếu Terminal báo lỗi, tự đọc log và sửa cho đến khi xanh mới được báo cáo công việc hoàn thành.
