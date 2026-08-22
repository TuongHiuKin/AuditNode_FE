# 🔍 Phân Tích Đồng Bộ API — AuditNode (FE ↔ BE)

> **Historical snapshot (May 2026):** Routes and findings below predate the Phase 3–8 remediation and must not be used as the current contract. See [API.md](./API.md) and [FRONTEND_REMEDIATION_PHASES_3_8.md](./FRONTEND_REMEDIATION_PHASES_3_8.md) for the active frontend behavior.

> **Ngày tạo:** 2026-05-25  
> **Mục đích:** Phát hiện các API chưa đồng bộ giữa Frontend và Backend

> ⚠️ Phát hiện **3 vấn đề nghiêm trọng** (Critical) và **4 vấn đề trung bình** (Medium) về đồng bộ API giữa Frontend và Backend.

---

## Tổng Quan

### Backend Endpoints (5 Controllers, 10 Endpoints)

| # | Controller | Method | Route |
|---|-----------|--------|-------|
| 1 | Analytics | `GET` | `/api/Analytics/topology` |
| 2 | Analytics | `GET` | `/api/Analytics/dependencies` |
| 3 | Applications | `GET` | `/api/Applications` |
| 4 | Applications | `POST` | `/api/Applications` |
| 5 | Datacenters | `GET` | `/api/Datacenters` |
| 6 | Datacenters | `POST` | `/api/Datacenters` |
| 7 | Servers | `GET` | `/api/Servers` |
| 8 | Servers | `POST` | `/api/Servers` |
| 9 | Topology | `GET` | `/api/Topology/tree` |
| 10 | Topology | `GET` | `/api/Topology/map` |

### Frontend API Calls (thực tế gọi trong code)

| # | Component | Method | URL gọi | Trạng thái |
|---|-----------|--------|---------|------------|
| 1 | ServerTable | `GET` | `/api/Servers` | ✅ Đúng |
| 2 | AppTable | `GET` | `/api/Applications` | ✅ Đúng |
| 3 | RegisterModal | `POST` | `/api/Servers` | ⚠️ Thiếu fields |
| 4 | RegisterModal | `POST` | `/api/Applications` | ⚠️ Thiếu fields |
| 5 | Topology | `GET` | `/api/Topology/tree` | ✅ Đúng |
| 6 | useDependencyLogic | `GET` | `/api/dependency/map` | ❌ **URL SAI** |
| 7 | useDependencyLogic | `GET` | `/api/Applications` | ✅ Đúng |

---

## 🚨 Vấn Đề Nghiêm Trọng (Critical)

### 1. ❌ URL sai: `/api/dependency/map` — Endpoint không tồn tại

> **Severity:** CRITICAL — Luôn trả về 404  
> **File FE:** `src/features/dependency-graph/hooks/useDependencyLogic.ts` (dòng 38)  
> **File BE:** `AuditNode.API/Controllers/TopologyController.cs` (dòng 31-36)

| | FE gọi | BE thực tế |
|---|--------|-----------|
| **URL** | `/api/dependency/map` | `/api/Topology/map` |

Ngoài ra, FE còn truyền query params `environment` và `datacenterId` nhưng BE endpoint `GET /api/Topology/map` **không nhận bất kỳ params nào**:

**Hiện tại (FE):**
```typescript
const response = await apiClient.get<any>("/api/dependency/map", {
  params: {
    environment: selectedEnv,
    datacenterId: selectedDatacenter === "All" ? undefined : selectedDatacenter,
  },
});
```

**Fix Option A — Chỉ sửa URL FE:**
```typescript
const response = await apiClient.get<any>("/api/Topology/map");
```

**Fix Option B — Sửa cả BE để hỗ trợ filter:**
```csharp
// TopologyController.cs
[HttpGet("map")]
public async Task<ActionResult<DependencyMapDto>> GetDependencyMap(
    [FromQuery] string? environment, [FromQuery] Guid? datacenterId)
```

---

### 2. ❌ POST `/api/Servers` — FE gửi thiếu field + sai kiểu dữ liệu

> **Severity:** CRITICAL — Request sẽ fail  
> **File FE:** `src/app/components/RegisterModal.tsx` (dòng 21-27, 45)  
> **File BE:** `AuditNode.Application/DTOs/CreateServerDto.cs`

**BE `CreateServerDto` yêu cầu:**

| Field | Type BE | FE gửi? | Chi tiết |
|-------|---------|---------|----------|
| `datacenterId` | `Guid` | ⚠️ **Sai kiểu** | Gửi text `"Corporate Datacenter"` thay vì UUID |
| `ipAddress` | `string` | ✅ | |
| `hostname` | `string` | ✅ | |
| `osType` | `string` | ✅ | |
| `environment` | `string` | ✅ | |
| `datacenter` | `string` | ❌ **Không gửi** | |
| `status` | `string` | ❌ **Không gửi** | |

**FE state hiện tại:**
```typescript
const [infraData, setInfraData] = useState({
    datacenterId: "Corporate Datacenter",  // ❌ Phải là UUID (Guid)
    ipAddress: "",
    hostname: "",
    osType: "Ubuntu 22.04",
    environment: "Production",
    // ❌ Thiếu: status, datacenter
});
```

**Fix:**
```typescript
const [infraData, setInfraData] = useState({
    datacenterId: "",           // UUID từ GET /api/Datacenters
    ipAddress: "",
    hostname: "",
    osType: "Ubuntu 22.04",
    environment: "Production",
    datacenter: "",             // Thêm field
    status: "Active",           // Thêm field + default value
});
```

---

### 3. ❌ `datacenterId` — FE gửi text name thay vì UUID

> **Severity:** CRITICAL — BE parse Guid sẽ fail  
> **File FE:** `src/app/components/RegisterModal.tsx` (dòng 22)

```typescript
datacenterId: "Corporate Datacenter"  // ❌ Phải là UUID, ví dụ: "a1b2c3d4-..."
```

**Fix:** FE phải fetch danh sách Datacenters từ `GET /api/Datacenters` để lấy UUID, rồi dùng UUID đó cho `datacenterId`. Hiện tại dropdown datacenter đang hardcode text options thay vì dùng dữ liệu từ API.

---

## ⚠️ Vấn Đề Trung Bình (Medium)

### 4. POST `/api/Applications` — FE gửi thiếu `ownerId` (required)

> **Severity:** MEDIUM — Sẽ trả 400 Bad Request  
> **File FE:** `src/app/components/RegisterModal.tsx` (dòng 29-35, 50)  
> **File BE:** `AuditNode.API/Controllers/ApplicationsController.cs` (dòng 40-45)

**BE `CreateApplicationDto` yêu cầu:**

| Field | Type | FE gửi? | Required? |
|-------|------|---------|-----------|
| `appCode` | `string` | ✅ | ✅ Yes |
| `appName` | `string` | ✅ | ✅ Yes |
| `ownerId` | `string` | ❌ **Không gửi** | ✅ **Yes (validated)** |
| `portNumber` | `int` | ✅ | |
| `protocol` | `string` | ✅ | |
| `risk` | `string` | ❌ | |
| `icon` | `string` | ❌ | |
| `techStack` | `string` | ❌ | |
| `riskLevel` | `RiskLevel` | ❌ | |
| `targetApplicationId` | `Guid?` | ❌ | |
| `serverId` | `Guid` | ✅ | |

BE validation rõ ràng reject khi thiếu `ownerId`:
```csharp
if (string.IsNullOrWhiteSpace(appDto.AppCode) ||
    string.IsNullOrWhiteSpace(appDto.AppName) ||
    string.IsNullOrWhiteSpace(appDto.OwnerId))
{
    return BadRequest(new { error = "Required fields are missing" });
}
```

**Fix — Thêm các fields vào FE form state:**
```typescript
const [appData, setAppData] = useState({
    serverId: "",
    appCode: "",
    appName: "",
    ownerId: "",              // Thêm (REQUIRED)
    portNumber: 443,
    protocol: "HTTPS",
    risk: "",                 // Thêm (optional)
    icon: "",                 // Thêm (optional)
    techStack: "",            // Thêm (optional)
    riskLevel: 0,             // Thêm (optional)
    targetApplicationId: null, // Thêm (optional)
});
```

---

### 5. Các BE Endpoints không được FE gọi

Các endpoints có khai báo trong `v1-contract.ts` nhưng **không có component nào gọi thực tế**:

| Endpoint | Mô tả | Đánh giá |
|----------|--------|----------|
| `GET /api/Analytics/topology` | Lấy dữ liệu phân tích topology | 📋 Chưa triển khai trên FE |
| `GET /api/Analytics/dependencies` | Lấy dữ liệu phân tích dependencies | 📋 Chưa triển khai trên FE |
| `GET /api/Datacenters` | Lấy danh sách datacenter | 🔴 **CẦN GỌI** để fix issue #3 |
| `POST /api/Datacenters` | Tạo datacenter mới | 📋 Chưa có UI form |
| `GET /api/Topology/map` | Lấy dependency map | 🔴 **CẦN GỌI** — FE đang gọi sai URL |

---

### 6. GET `/api/Servers` — FE không truyền query params có sẵn

**BE hỗ trợ filter:**
```csharp
// ServersController.cs
public async Task<...> GetServers(
    [FromQuery] string? environment,
    [FromQuery] Guid? datacenterId)
```

**FE không truyền params:**
```typescript
// ServerTable.tsx
const response = await apiClient.get<ServerRow[]>("/api/Servers");
// → Luôn lấy toàn bộ server, không filter
```

---

### 7. Type Safety — FE dùng `any` thay vì typed schemas

FE có file `v1-contract.ts` với đầy đủ type definitions nhưng nhiều nơi dùng `any`:

| File | Dòng | Hiện tại | Nên dùng |
|------|------|----------|----------|
| `AppTable.tsx` | 32 | `get<any>` | `get<Schemas["ApplicationResponseDto"][]>` |
| `Topology.tsx` | 14 | `get<any>` | `get<Schemas["TopologyTreeDto"][]>` |
| `useDependencyLogic.ts` | 37 | `get<any>` | `get<Schemas["DependencyMapDto"]>` |
| `useDependencyLogic.ts` | 124 | `get<any>` | `get<Schemas["ApplicationResponseDto"][]>` |

---

## 📊 Ma Trận Đồng Bộ API

```
BE Endpoint                    │ FE gọi?  │ URL đúng? │ Data đúng? │ Trạng thái
───────────────────────────────┼──────────┼───────────┼────────────┼─────────────
GET  /api/Analytics/topology   │ ❌        │ —         │ —          │ Chưa dùng
GET  /api/Analytics/deps       │ ❌        │ —         │ —          │ Chưa dùng
GET  /api/Applications         │ ✅        │ ✅         │ ✅          │ ✅ OK
POST /api/Applications         │ ✅        │ ✅         │ ⚠️ Thiếu   │ ⚠️ Medium
GET  /api/Datacenters          │ ❌        │ —         │ —          │ Cần dùng
POST /api/Datacenters          │ ❌        │ —         │ —          │ Chưa dùng
GET  /api/Servers              │ ✅        │ ✅         │ ✅          │ ✅ OK
POST /api/Servers              │ ✅        │ ✅         │ ❌ Sai      │ 🔴 Critical
GET  /api/Topology/tree        │ ✅        │ ✅         │ ✅          │ ✅ OK
GET  /api/Topology/map         │ ✅        │ ❌ Sai URL │ ⚠️ Params  │ 🔴 Critical
```

---

## ✅ Khuyến Nghị Theo Thứ Tự Ưu Tiên

### Ưu tiên 1 — Fix ngay (Critical)
1. Sửa URL `/api/dependency/map` → `/api/Topology/map` trong `useDependencyLogic.ts`
2. Fetch `GET /api/Datacenters` trong RegisterModal để lấy UUID thực
3. Thêm `ownerId` vào form đăng ký Application

### Ưu tiên 2 — Fix sớm (Medium)
4. Thêm fields `status`, `datacenter` vào form đăng ký Server
5. Thêm filter params cho `GET /api/Servers` trong ServerTable
6. Sử dụng typed schemas thay vì `any` trong API calls

### Ưu tiên 3 — Cải thiện (Low)
7. Triển khai UI cho Analytics endpoints
8. Triển khai UI cho Create Datacenter
9. Cải thiện error handling với typed responses
