---
name: keycloak_auth_protector
description: Kích hoạt khi chỉnh sửa các logic liên quan đến xác thực (Auth), đăng nhập, API Client, Axios interceptors.
---
# Keycloak Auth Integrity Guard

1. Giữ nguyên luồng khởi tạo PKCE-enabled guard của Keycloak.
2. Mọi API call (nếu viết mới) phải đi qua Axios instance chuẩn đã được bọc logic tự động chèn Token (Token Injection).
3. Cấm dùng `fetch` thuần hoặc khởi tạo Axios instance lạ để tránh làm vỡ tính năng silent token refresh.
