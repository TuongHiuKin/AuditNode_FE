# AuditNode DB MCP

MCP server cục bộ, chỉ đọc, dùng để giúp Codex phân tích cấu trúc label,
server, application và dependency của AuditNode bằng dữ liệu tổng hợp.

Server không cung cấp tool SQL tự do, không trả về sample row và chỉ đăng ký
7 tool cố định:

1. `get_schema_summary`
2. `get_inventory_counts`
3. `get_label_usage`
4. `get_label_overlap`
5. `get_server_app_density_by_label`
6. `get_dependency_label_stats`
7. `get_unused_label_stats`

## Các lớp bảo vệ

- Mọi truy vấn nghiệp vụ đều bị giới hạn bởi `AUDITNODE_OWNER_ID`.
- PostgreSQL transaction luôn dùng `BEGIN READ ONLY`.
- SQL guard chỉ nhận `SELECT` hoặc `WITH`, không nhận nhiều statement.
- Query timeout mặc định là 5 giây.
- Số dòng trả về mặc định tối đa 200.
- Tài khoản PostgreSQL riêng chỉ có `SELECT` trên 9 bảng cần thiết.
- `.env.local` bị git-ignore; secret không nằm trong source hoặc Codex config.

`get_schema_summary` đọc metadata của đúng 9 bảng từ `information_schema`; đây
là tool duy nhất không cần owner filter vì nó không đọc dữ liệu nghiệp vụ.

## Cấu hình local

1. Khởi động PostgreSQL local của AuditNode.
2. Chạy `sql/create-readonly-role.sql` một lần bằng database owner. Script đang
   dùng database local của dự án là `AuditNode.db`; nếu môi trường khác tên,
   sửa dòng `GRANT CONNECT` trước khi chạy.
   Khi psql chạy dòng `\password auditnode_chat_reader`, nhập mật khẩu mới cho
   role. Dùng chính mật khẩu đó tại dòng `POSTGRES_PASSWORD` trong `.env.local`.
3. File `.env.local` đã được tạo sẵn. Thay `PUT_READER_PASSWORD_HERE` bằng mật
   khẩu của role và `PUT_OWNER_ID_HERE` bằng Keycloak subject/`owner_id`.
   Với môi trường local của repository này, có thể tạo/cập nhật role từ mật
   khẩu trong `.env.local` mà không in mật khẩu bằng:

   ```powershell
   npm.cmd run setup:role
   ```
4. Chạy:

   ```powershell
   npm.cmd install
   npm.cmd run check
   ```

   Sau khi điền `.env.local`, kiểm tra role, mật khẩu và owner scope:

   ```powershell
   npm.cmd run test:connection
   ```

   Lệnh chỉ gọi `get_inventory_counts` và không in mật khẩu hoặc owner ID.
   Nếu đăng nhập thất bại, dùng `npm.cmd run test:role` để kiểm tra role và
   quyền SELECT mà không đọc hoặc hiển thị mật khẩu.

   Khi backend local và PostgreSQL đang chạy, có thể kiểm tra PostgreSQL parse
   đủ 7 câu SQL bằng:

   ```powershell
   npm.cmd run test:db
   ```

   Script này dùng cấu hình backend local trong process, luôn mở transaction
   `READ ONLY`, dùng owner giả không khớp dữ liệu và chỉ in số dòng tổng hợp.

5. Đăng ký server với Codex:

   ```powershell
   codex.cmd mcp add auditnode-db -- node F:\Project\AuditNode.Frontend\tools\auditnode-db-mcp\dist\server.js
   ```

6. Restart phiên Codex/chat để server mới được nạp.

## Ví dụ gọi từ chat

> Dùng auditnode-db lấy inventory counts và label usage, không đọc sample row,
> rồi đề xuất cách group server/application theo label trong Dependencies.

MCP process có thể khởi động và liệt kê tool trước khi `.env.local` tồn tại.
Kết nối DB chỉ được tạo khi một tool được gọi; nếu thiếu cấu hình, tool trả về
thông báo cấu hình an toàn và không in secret.
