# Hướng dẫn Postman: Đánh giá dịch vụ và Bảo hành

Tài liệu này chỉ hướng dẫn kiểm thử API đánh giá dịch vụ và yêu cầu bảo hành.

## Chuẩn bị Postman

Tạo Environment với các biến:

| Biến | Giá trị ban đầu |
|---|---|
| `baseUrl` | `http://localhost:8080` |
| `customerToken` | Để trống, lấy sau khi đăng nhập khách hàng |
| `employeeToken` | Để trống, lấy sau khi đăng nhập nhân viên được giao phiếu |
| `adminToken` | Để trống, lấy sau khi đăng nhập admin |
| `ticketId` | ID phiếu sửa chữa |
| `ticketCode` | Mã phiếu, ví dụ `PS00101` |
| `serviceId` | ID dịch vụ của phiếu |
| `warrantyRequestId` | ID yêu cầu bảo hành sau khi tạo |

### Đăng nhập lấy token

Gọi `POST {{baseUrl}}/api/auth/login`, Body chọn `raw` → `JSON`:

```json
{
  "email": "customer@example.com",
  "password": "mat-khau"
}
```

Lấy `token` trong response. Với từng request, chọn tab **Authorization** → **Bearer Token**, nhập token phù hợp với vai trò. Đổi email sang tài khoản nhân viên hoặc admin để lấy token tương ứng.

## 1. Đánh giá dịch vụ

### Điều kiện

- Phiếu sửa chữa phải ở trạng thái `COMPLETED`.
- Phiếu phải thuộc khách hàng đang đăng nhập.
- Mỗi phiếu chỉ được đánh giá một lần.
- Số sao từ 1 đến 5; nhận xét là tùy chọn, tối đa 1.000 ký tự.

### Gửi đánh giá

Gọi `POST {{baseUrl}}/api/repair-tickets/{{ticketId}}/reviews` bằng Bearer Token khách hàng. Chọn Body → `raw` → `JSON`:

```json
{
  "rating": 5,
  "comment": "Sửa nhanh, thiết bị hoạt động tốt."
}
```

Thành công trả `201 Created`, gồm `id`, `ticketCode`, `rating`, `comment` và `createdAt`. Lưu `ticketId` của phiếu; ID này khác mã phiếu `ticketCode`.

### Xem đánh giá

- Khách xem đánh giá của mình: `GET {{baseUrl}}/api/reviews/me` — Bearer Token khách hàng.
- Xem đánh giá của một phiếu: `GET {{baseUrl}}/api/repair-tickets/{{ticketId}}/reviews` — người dùng đã đăng nhập.
- Xem đánh giá theo dịch vụ: `GET {{baseUrl}}/api/services/{{serviceId}}/reviews` — người dùng đã đăng nhập.
- Admin xem tất cả: `GET {{baseUrl}}/api/reviews` — Bearer Token admin.

### Kiểm tra lỗi

- Gửi `rating` bằng `0`, `6` hoặc bỏ trống: `400 Bad Request`.
- Đánh giá phiếu chưa `COMPLETED`: `400 Bad Request`.
- Dùng khách hàng khác với chủ phiếu: `403 Forbidden`.
- Đánh giá lại phiếu đã có đánh giá: `409 Conflict`.

## 2. Gửi yêu cầu bảo hành

### Điều kiện bảo hành hiện tại

- Phiếu phải thuộc khách hàng đang đăng nhập và có trạng thái `COMPLETED`.
- Backend đang tính thời hạn **30 ngày từ `completedDate`**. Ngày hết hạn vẫn được tính là còn hạn; sau ngày đó API từ chối tạo yêu cầu.
- Nếu phiếu chưa có `completedDate`, API không thể xác định hạn và từ chối yêu cầu.
- Mỗi phiếu không thể có yêu cầu khác đang `PENDING` hoặc `APPROVED`.

### Tạo yêu cầu

Gọi `POST {{baseUrl}}/api/warranty-requests` bằng Bearer Token khách hàng. Chọn Body → `form-data`:

| Key | Type | Bắt buộc | Ví dụ |
|---|---|---:|---|
| `ticketCode` | Text | Có | `PS00101` |
| `reason` | Text | Có | `Máy tự tắt sau khoảng 10 phút sử dụng` |
| `description` | Text | Không | `Lỗi xuất hiện từ hôm qua` |
| `attachment` | File | Không | Ảnh JPG/PNG hoặc tài liệu PDF |

Tệp tối đa 5 MB. Postman tự đặt `Content-Type: multipart/form-data`; không tự thêm header này. Thành công trả `201 Created` với trạng thái ban đầu `PENDING`. Lưu `id` trong response vào biến `warrantyRequestId`.

### Khách xem trạng thái và tệp

- Xem các yêu cầu của mình: `GET {{baseUrl}}/api/warranty-requests/me` — Bearer Token khách hàng.
- Tải tệp đính kèm: `GET {{baseUrl}}/api/warranty-requests/{{warrantyRequestId}}/attachment` — khách sở hữu phiếu, kỹ thuật viên được giao phiếu hoặc admin. Trong Postman chọn **Send and Download** để lưu tệp.

### Nhân viên xem yêu cầu được giao

Dùng Bearer Token kỹ thuật viên được giao phiếu:

- Xem danh sách phiếu mình phụ trách: `GET {{baseUrl}}/api/warranty-requests`.
- Lọc theo trạng thái: `GET {{baseUrl}}/api/warranty-requests?status=PENDING`.
- Xem chi tiết một yêu cầu: `GET {{baseUrl}}/api/warranty-requests/{{warrantyRequestId}}`.
- Xem các yêu cầu theo phiếu: `GET {{baseUrl}}/api/repair-tickets/{{ticketId}}/warranty-requests`.

Nhân viên chỉ xem và xử lý yêu cầu của phiếu được giao cho mình. Admin có thể xem và xử lý tất cả yêu cầu.

### Nhân viên duyệt hoặc từ chối

Gọi `PATCH {{baseUrl}}/api/warranty-requests/{{warrantyRequestId}}/process` bằng Bearer Token kỹ thuật viên được giao hoặc admin. Body chọn `raw` → `JSON`.

Duyệt yêu cầu:

```json
{
  "status": "APPROVED",
  "resolutionNote": "Phiếu còn hạn, tiếp nhận kiểm tra bảo hành."
}
```

Từ chối yêu cầu; phải ghi lý do:

```json
{
  "status": "REJECTED",
  "resolutionNote": "Lỗi phát sinh không thuộc phạm vi bảo hành."
}
```

Sau khi xử lý bảo hành xong, chuyển yêu cầu đã duyệt sang `COMPLETED`:

```json
{
  "status": "COMPLETED",
  "resolutionNote": "Đã xử lý xong yêu cầu bảo hành."
}
```

Các chuyển trạng thái hợp lệ: `PENDING` → `APPROVED` hoặc `REJECTED`; `APPROVED` → `COMPLETED`.

### Kiểm tra lỗi và phân quyền

- Mã phiếu không tồn tại: `404 Not Found`.
- Phiếu không thuộc khách đang đăng nhập: `403 Forbidden`.
- Phiếu chưa hoàn thành, hết hạn hoặc yêu cầu đang mở đã tồn tại: API từ chối tạo yêu cầu.
- Nhân viên không được giao phiếu thử xem chi tiết, tải tệp hoặc xử lý yêu cầu của phiếu đó: `403 Forbidden`.
- Từ chối nhưng không có `resolutionNote`, hoặc chuyển trạng thái sai luồng: API từ chối cập nhật.

## Luồng Postman đầy đủ

1. Đăng nhập khách, lấy `customerToken`.
2. Gửi đánh giá cho phiếu `COMPLETED` bằng API tạo đánh giá; xem lại bằng `GET /api/reviews/me`.
3. Gửi yêu cầu bảo hành với `ticketCode` của phiếu đủ điều kiện; lưu `warrantyRequestId`.
4. Gọi `GET /api/warranty-requests/me` để xác nhận yêu cầu ở trạng thái `PENDING`.
5. Đăng nhập kỹ thuật viên được giao phiếu; xem danh sách và tải tệp đính kèm nếu có.
6. Dùng tài khoản kỹ thuật viên đó duyệt hoặc từ chối. Đăng nhập kỹ thuật viên khác để thử truy cập và xác nhận bị `403`.
7. Nếu đã duyệt, cập nhật `COMPLETED`; đăng nhập lại khách và xem trạng thái mới.
