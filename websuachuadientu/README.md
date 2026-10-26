# Tài liệu các API đã cập nhật

## Quy ước chung

- Các endpoint bên dưới có tiền tố `/api`.
- Gửi token trong header: `Authorization: Bearer <token>`.
- `{id}`, `{ticketId}` và `{quoteId}` là ID tương ứng trong hệ thống.
- Ngày giờ trong JSON dùng định dạng ISO của Java, ví dụ `2026-10-26` và `14:30:00`.

## 1. Lịch hẹn được giao cho nhân viên, chia theo nhóm

### `GET /api/appointments/assigned/me/groups`

**Ai dùng:** Nhân viên đã đăng nhập.

**Dùng để:** Lấy lịch được giao cho nhân viên hiện tại, chia nhóm để giao diện hiển thị lịch cần xử lý và lịch đã tiếp nhận. Lịch chờ xác nhận vẫn được trả về.

**Đầu vào:** Không có query parameter hoặc request body. Tài khoản hiện tại được xác định từ Bearer token.

**Phản hồi `200 OK`:**

```json
{
  "actionRequired": [
    { "id": 18, "customerName": "Nguyễn An", "device": "Laptop", "status": "PENDING" },
    { "id": 19, "customerName": "Trần Bình", "device": "Điện thoại", "status": "CONFIRMED" }
  ],
  "received": [
    { "id": 20, "customerName": "Lê Chi", "device": "Máy tính", "status": "RECEIVED" }
  ],
  "other": []
}
```

Mỗi phần tử là một lịch hẹn, gồm các trường lịch hẹn như `id`, khách hàng, thiết bị, dịch vụ, thời gian, cách phục vụ, mô tả lỗi và `status`.

- `actionRequired`: lịch `PENDING` (chờ xác nhận), `CONFIRMED` hoặc `CANCELLATION_REQUESTED`.
- `received`: lịch đã tiếp nhận thiết bị (`RECEIVED`).
- `other`: trạng thái khác, ví dụ `CANCELLED` hoặc `CONVERTED`.

API cũ `GET /api/appointments/assigned/me` vẫn trả danh sách phẳng.

## 2. Tiếp nhận thiết bị

### `POST /api/repair-tickets/{id}/intake`

**Ai dùng:** Kỹ thuật viên được giao phiếu hoặc admin.

**Dùng để:** Ghi nhận tình trạng thiết bị lúc nhận, phụ kiện, lỗi khách báo, ghi chú tiếp nhận và ảnh. Khi thành công, phiếu sửa và lịch hẹn liên kết chuyển sang `RECEIVED`.

**Đầu vào:** `multipart/form-data`.

| Trường | Bắt buộc | Ý nghĩa và giới hạn |
|---|---:|---|
| `serialNumber` | Không | Số serial, tối đa 100 ký tự |
| `appearanceCondition` | Có | Tình trạng thiết bị, tối đa 2.000 ký tự |
| `includedAccessories` | Không | Phụ kiện đi kèm, tối đa 2.000 ký tự |
| `customerReportedIssue` | Không | Lỗi khách báo, tối đa 5.000 ký tự |
| `intakeNote` | Không | Ghi chú tiếp nhận, tối đa 2.000 ký tự |
| `images` | Có | Từ 1 đến 5 ảnh JPEG/PNG, tối đa 5 MB mỗi ảnh |

Ví dụ gửi form-data: `appearanceCondition=Trầy nhẹ mặt đáy`, `includedAccessories=Sạc`, `intakeNote=Khách báo máy tự tắt`; thêm một hoặc nhiều file với key `images`.

**Phản hồi:** `201 Created`, gồm mã phiếu, thiết bị, thông tin tiếp nhận, người tiếp nhận, thời gian và danh sách ảnh dạng data URI.

**Lỗi thường gặp:** `400` nếu thiếu trường bắt buộc hoặc ảnh không hợp lệ; `403` nếu không phải kỹ thuật viên được giao/admin; `409` nếu phiếu không còn `SCHEDULED`, đã có biên nhận hoặc lịch đang chờ xử lý yêu cầu hủy.

## 3. Chẩn đoán

### `PUT /api/repair-tickets/{id}/diagnosis`

**Ai dùng:** Kỹ thuật viên được giao phiếu hoặc admin.

**Dùng để:** Lưu kết quả kiểm tra và đề xuất sửa chữa. Cần tiếp nhận thiết bị trước; lưu chẩn đoán sẽ chuyển phiếu sang trạng thái chẩn đoán.

**Đầu vào:** JSON.

```json
{
  "diagnosisResult": "Kiểm tra adapter và mạch nguồn. Phát hiện nguồn lỗi.",
  "repairProposal": "Thay nguồn tương thích và vệ sinh mạch.",
  "technicalNote": "Đã kiểm tra ngoại quan trước khi tháo máy."
}
```

`diagnosisResult` và `repairProposal` bắt buộc, tối đa 5.000 ký tự mỗi trường. `technicalNote` tùy chọn, tối đa 2.000 ký tự.

### `GET /api/repair-tickets/{id}/diagnosis`

**Ai dùng:** Kỹ thuật viên được giao phiếu hoặc admin.

**Dùng để:** Lấy thông tin chẩn đoán đã lưu để hiển thị hoặc tiếp tục xử lý.

**Đầu vào:** Không có body; `{id}` là ID phiếu sửa.

**Phản hồi:** `200 OK`, gồm `diagnosisResult`, `repairProposal`, `technicalNote`, người chẩn đoán và thời gian. Trường `customerReportedIssue` được dùng cho ô **Lỗi tiếp nhận**: ưu tiên lấy từ `intakeNote`, nếu trống thì lấy `customerReportedIssue`; nếu chưa có biên nhận thì lấy mô tả lỗi của lịch hẹn.

## 4. Tạo và xác nhận báo giá

### `POST /api/repair-tickets/{ticketId}/quote`

**Ai dùng:** Kỹ thuật viên được giao phiếu hoặc admin.

**Dùng để:** Tạo báo giá sau khi đã lưu chẩn đoán. Mỗi phiếu chỉ được tạo một báo giá; tạo báo giá chuyển phiếu sang chờ xác nhận và ghi sự kiện vào lịch sử xử lý.

**Đầu vào:** JSON, có từ 1 đến 100 dòng hàng.

```json
{
  "items": [
    { "name": "Adapter nguồn", "quantity": 1, "unitPrice": 450000 },
    { "name": "Công sửa chữa", "quantity": 1, "unitPrice": 200000 }
  ]
}
```

Mỗi dòng gồm tên, số lượng và đơn giá. Tổng tiền được tính từ các dòng hàng.

**Phản hồi:** `201 Created`, gồm mã báo giá, các dòng hàng, tổng tiền, trạng thái và thời gian tạo.

### `GET /api/repair-tickets/{ticketId}/quote`

**Ai dùng:** Khách hàng sở hữu phiếu, kỹ thuật viên được giao hoặc admin.

**Dùng để:** Xem báo giá của phiếu. Khách chỉ xem được báo giá thuộc phiếu của mình.

**Đầu vào:** Không có body; `ticketId` là ID phiếu sửa.

### `PATCH /api/quotes/{quoteId}/decision`

**Ai dùng:** Khách hàng sở hữu báo giá. Kỹ thuật viên được giao/admin cũng có thể gọi theo quyền hiện tại của API.

**Dùng để:** Xác nhận hoặc từ chối báo giá đang ở trạng thái `SENT`. Hành động được ghi vào lịch sử. Xác nhận chuyển phiếu sang `REPAIRING`; từ chối chuyển sang `CUSTOMER_DECLINED`.

**Đầu vào:** JSON.

```json
{ "decision": "ACCEPTED" }
```

`decision` nhận `ACCEPTED` hoặc `REJECTED`.

**Phản hồi:** `200 OK`, gồm trạng thái mới của báo giá và tổng tiền.

## 5. Tiến độ và dòng thời gian sửa chữa

### `PATCH /api/repair-tickets/{id}/status`

**Ai dùng:** Kỹ thuật viên được giao phiếu hoặc admin.

**Dùng để:** Ghi từng lần cập nhật tiến độ, kèm ghi chú và ảnh. Các trạng thái `REPAIRING`, `IN_PROGRESS` và `WAITING_FOR_PARTS` có thể cập nhật nhiều lần. Gửi `COMPLETED` khi kết thúc sửa chữa.

**Đầu vào:** `multipart/form-data`.

| Trường | Bắt buộc | Ý nghĩa và giới hạn |
|---|---:|---|
| `status` | Có | Trạng thái tiến độ hợp lệ, ví dụ `REPAIRING`, `WAITING_FOR_PARTS`, `IN_PROGRESS`, `COMPLETED` |
| `note` | Không | Ghi chú tiến độ, tối đa 2.000 ký tự |
| `images` | Có | Từ 1 đến 5 ảnh JPEG/PNG, tối đa 5 MB mỗi ảnh |

**Phản hồi:** `200 OK`, gồm trạng thái, ghi chú, thời gian, nhân viên cập nhật và ảnh. Mỗi cập nhật được lưu trong tracking và lịch sử xử lý.

### `GET /api/repair-tickets/{id}/tracking`

**Ai dùng:** Khách hàng sở hữu phiếu, kỹ thuật viên được giao hoặc admin.

**Dùng để:** Xem trạng thái hiện tại và dòng thời gian đầy đủ của phiếu.

**Đầu vào:** Không có body; `{id}` là ID phiếu sửa.

**Phản hồi `200 OK`:**

- `currentStatus`: trạng thái hiện tại của phiếu.
- `updates`: danh sách cập nhật tiến độ cũ, giữ nguyên để tương thích client.
- `timeline`: các sự kiện đã sắp theo thời gian: tiếp nhận (tình trạng, phụ kiện, lỗi và ghi chú), chẩn đoán, báo giá, khách xác nhận/từ chối, cập nhật sửa chữa và hoàn thành.

Mỗi sự kiện trong `timeline` có `type`, `title`, `details`, `note`, `createdAt` và `actorName`.

## 6. Lịch sử xử lý

### `GET /api/repair-tickets/{id}/history`

**Ai dùng:** Kỹ thuật viên được giao phiếu hoặc admin.

**Dùng để:** Lấy các hoạt động xử lý theo thứ tự thời gian, gồm tiếp nhận, chẩn đoán, báo giá, quyết định của khách và cập nhật trạng thái.

**Đầu vào:** Không có body; `{id}` là ID phiếu sửa.

**Phản hồi:** Danh sách sự kiện, mỗi mục có `action`, `details`, `note`, `employeeName` và `createdAt`. Để xem cùng dữ liệu tiến độ theo một dòng thời gian, dùng endpoint tracking ở trên.
