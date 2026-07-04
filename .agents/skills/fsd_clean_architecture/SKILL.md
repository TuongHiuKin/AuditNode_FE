---
name: fsd_clean_architecture
description: Kích hoạt khi chỉnh sửa hoặc tạo mới component Frontend, thay đổi cấu trúc thư mục, hoặc thêm file mới vào src/.
---
# FSD-Lite Architecture Guardrails (Frontend)

## Cấu trúc thư mục bắt buộc
```
src/
├── app/            # App shell, routing, global providers
├── features/       # Tính năng nghiệp vụ (dependency-graph, ...)
├── shared/
│   ├── api/        # API client, generated types (v1-contract.ts)
│   ├── ui/         # Reusable UI components (Button, Dropdown, SlidePanel, DataCard)
│   └── utils/      # Hàm tiện ích dùng chung
├── hooks/          # Custom hooks dùng chung
├── services/       # Service layer (nếu cần)
└── styles/         # Global CSS, theme tokens
```

## Các ràng buộc:
1. **Single Responsibility:** Mỗi Component chỉ làm MỘT việc. Nếu một Component vượt quá 150 dòng, cần xem xét tách nhỏ.
2. **Không gọi API trực tiếp trong Component:** Phải thông qua custom hook hoặc React Query (`useQuery`/`useMutation`).
3. **Shared UI là nguồn duy nhất:** Khi cần Button, Dropdown, Panel — import từ `src/shared/ui/`. Cấm tự viết lại inline.
4. **Feature không import lẫn nhau:** `features/A` cấm import từ `features/B`. Nếu cần chia sẻ, đưa lên `shared/`.
