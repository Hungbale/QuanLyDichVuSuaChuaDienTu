# API kiểm tra và hoàn thành sửa chữa

Tài liệu này chỉ mô tả luồng nhân viên kiểm tra thiết bị sau sửa chữa, lưu kết quả và hoàn thành phiếu.

## Quyền truy cập và điều kiện

- Người gọi API phải đăng nhập bằng Bearer token.
- Kỹ thuật viên được giao phiếu hoặc admin mới được lưu/đọc checklist.
- Phiếu phải đang ở trạng thái `REPAIRING` hoặc `IN_PROGRESS`.
- Để hoàn thành phiếu, cả ba mục kiểm tra phải đạt và phải có thông tin hoàn thành.

## Lưu kết quả kiểm tra hoặc hoàn tất phiếu

### `POST /api/repair-tickets/{id}/final-inspection`

**Mục đích:** Lưu checklist kiểm tra cuối. Endpoint này phục vụ cả hai nút trên màn hình:

- **Bổ sung thông tin:** gửi `complete: false`; checklist/ghi chú được lưu, phiếu vẫn đang sửa.
- **Hoàn thành đơn sửa chữa:** gửi `complete: true`; backend xác thực điều kiện rồi mới chuyển trạng thái.

**Đầu vào:** `application/json`. Thay `{id}` bằng ID phiếu.

```json
{
  "deviceWorksNormally": true,
  "mainFunctionsWork": true,
  "noNewIssues": true,
  "completionInfo": "Đã thay adapter, kiểm tra sạc và chạy thử.",
  "complete": true
}
```

| Trường | Kiểu | Bắt buộc | Ý nghĩa |
|---|---|---:|---|
| `deviceWorksNormally` | boolean | Có | Thiết bị hoạt động bình thường |
| `mainFunctionsWork` | boolean | Có | Chức năng chính hoạt động |
| `noNewIssues` | boolean | Có | Không có lỗi phát sinh |
| `completionInfo` | string | Khi hoàn tất | Thông tin kiểm tra/sửa chữa, tối đa 5.000 ký tự |
| `complete` | boolean | Có | `false` chỉ lưu; `true` yêu cầu hoàn thành phiếu |

**Khi `complete: false`:** backend lưu cả trạng thái đạt/chưa đạt của từng mục và ghi chú. Phiếu không đổi trạng thái.

**Khi `complete: true`:** cả ba mục phải là `true`, `completionInfo` không được trống và phiếu phải đang `REPAIRING` hoặc `IN_PROGRESS`. Backend lưu checklist, chuyển phiếu và lịch hẹn liên kết sang `COMPLETED`, đặt ngày hoàn thành và ghi lịch sử trong cùng transaction.

**Phản hồi thành công `200 OK`:**

```json
{
  "id": 7,
  "ticketId": 125,
  "ticketCode": "PS00125",
  "deviceWorksNormally": true,
  "mainFunctionsWork": true,
  "noNewIssues": true,
  "completionInfo": "Đã thay adapter, kiểm tra sạc và chạy thử.",
  "inspectedBy": "Nguyễn A",
  "inspectedAt": "2026-10-31T14:25:00",
  "completedAt": "2026-10-31T14:25:00",
  "ticketStatus": "COMPLETED"
}
```

`completedAt` là `null` nếu chỉ lưu checklist bằng `complete: false`.

**Lỗi thường gặp:**

- `400 Bad Request`: thiếu trường bắt buộc hoặc thiếu `completionInfo` khi hoàn tất.
- `403 Forbidden`: tài khoản không phải kỹ thuật viên được giao hoặc admin.
- `404 Not Found`: không tìm thấy phiếu.
- `409 Conflict`: phiếu không ở trạng thái sửa chữa hoặc có mục kiểm tra chưa đạt.

## Đọc checklist đã lưu

### `GET /api/repair-tickets/{id}/final-inspection`

**Mục đích:** Tải lại checklist để hiển thị khi mở màn hình kiểm tra cuối.

**Quyền:** Kỹ thuật viên được giao phiếu hoặc admin.

**Đầu vào:** ID phiếu trong URL; không có query parameter hoặc request body.

**Phản hồi:** `200 OK` với cấu trúc như response mẫu ở trên. Nếu chưa có checklist, trả `404 Not Found`.

## Luồng kiểm tra bằng Postman

Chuẩn bị phiếu đang `REPAIRING` hoặc `IN_PROGRESS`; chọn Bearer Token của kỹ thuật viên được giao phiếu hoặc admin.

1. Gửi `POST http://localhost:8080/api/repair-tickets/{id}/final-inspection` với `complete: false`. Kiểm tra nhận `200 OK`; phiếu vẫn ở trạng thái sửa chữa.
2. Thử gửi `complete: true` trong khi một mục là `false`. Kỳ vọng `409 Conflict`; phiếu không hoàn thành.
3. Gửi lại với cả ba mục `true`, có nội dung `completionInfo` và `complete: true`. Kỳ vọng `200 OK`, `ticketStatus: COMPLETED` và `completedAt` có giá trị.
4. Gọi `GET /api/repair-tickets/{id}/final-inspection` để xác nhận checklist đã lưu.

Không thể hoàn thành bằng `PATCH /api/repair-tickets/{id}/status`; endpoint tiến độ từ chối `COMPLETED` để không bỏ qua checklist.
