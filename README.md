# Web sửa chữa điện tử – Hướng dẫn API backend


## Hướng dẫn cấu hình môi trường và chạy Backend

### 1. Chuẩn bị môi trường

Cài đặt và khởi động Docker Desktop trước khi thực hiện các bước tiếp theo.

### 2. Tạo file `.env`

Tại thư mục ngang hàng với file `docker-compose.yml`, tạo file có tên `.env` (nếu chưa có). Điền nội dung sau:

```env
MYSQL_ROOT_PASSWORD=change-this-root-password
MYSQL_DATABASE=repair_service
MYSQL_USER=repair_user
MYSQL_PASSWORD=change-this-database-password
ADMIN_EMAIL=admin@repair.local
ADMIN_PASSWORD=change-this-admin-password
```

Thay các giá trị mật khẩu mẫu bằng giá trị phù hợp cho môi trường chạy của bạn. Các biến phải được giữ đúng tên để khớp với cấu hình Docker Compose.

**Lưu ý:** Không đưa file `.env` thật lên GitHub vì file này chứa thông tin cấu hình nhạy cảm. Nếu dự án có file `.env.example`, hãy sao chép file đó thành `.env` rồi điền các giá trị tương ứng.

### 3. Khởi chạy Backend và Database

Mở Terminal tại thư mục chứa `docker-compose.yml`, chạy lệnh:

```bash
docker compose up -d --build
```

Docker sẽ build image cần thiết và khởi chạy các service được khai báo trong file Docker Compose.

### 4. Kiểm tra trạng thái

Kiểm tra các container:

```bash
docker compose ps
```

Xem log Backend:

```bash
docker compose logs -f backend
```

Nhấn `Ctrl + C` để thoát màn hình xem log. Các container chạy nền vẫn tiếp tục hoạt động.


Lệnh `docker compose down` thông thường không xóa dữ liệu trong named volume của MySQL. Không sử dụng `docker compose down -v` nếu muốn giữ dữ liệu database.

# Hướng dẫn API – Quản lý dịch vụ sửa chữa điện tử

Tài liệu này mô tả các API đang khai báo trong backend. Ví dụ dùng `http://localhost:8080` làm địa chỉ gốc. Các API cần đăng nhập nhận JWT qua header:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

Đăng nhập tại `POST /api/auth/login` để lấy token. Quyền dưới đây là quyền backend yêu cầu; một số endpoint còn kiểm tra chủ sở hữu lịch/phiếu hoặc nhân viên được phân công.

## Luồng nghiệp vụ sửa chữa

1. Khách đăng nhập, xem danh mục và dịch vụ, kiểm tra khung giờ, rồi tạo lịch. Lịch mới ở trạng thái `PENDING`.
2. Nhân viên xem lịch chờ và xác nhận/phân công bằng `PATCH /api/appointments/{id}/assign`. Nhân viên tự nhận lịch; admin giao cho kỹ thuật viên đang ít việc nhất. Backend chuyển lịch sang `CONFIRMED` và tạo phiếu sửa chữa `SCHEDULED`.
3. Khi nhận thiết bị, nhân viên ghi nhận tình trạng bằng API intake; phiếu thành `RECEIVED`.
4. Nhân viên lưu kết quả kiểm tra và phương án sửa chữa bằng API diagnosis; phiếu chuyển sang `DIAGNOSING`. Sau đó nhân viên tạo báo giá; phiếu chuyển sang `WAITING_FOR_QUOTE_APPROVAL`.
5. Khách xem báo giá và chọn `ACCEPTED` hoặc `REJECTED`. Chấp nhận thì phiếu chuyển sang sửa chữa; từ chối thì kết thúc ở `CUSTOMER_DECLINED`.
6. Nhân viên cập nhật các bước sửa chữa có ảnh. Khi hoàn tất, khách có thể khởi tạo thanh toán; nhân viên xác nhận đã nhận tiền.

Khách hủy lịch `PENDING` bằng `DELETE /api/appointments/{id}`. Lịch đã `CONFIRMED` cần gửi yêu cầu hủy có lý do; nhân viên/admin duyệt hoặc từ chối. Yêu cầu hủy chỉ xử lý được trước khi thiết bị được tiếp nhận.

## Xác thực

### `POST /api/auth/register` — tạo tài khoản khách

Quyền: công khai. Trả `201` cùng thông tin tài khoản.

```json
{
  "email": "khach@example.com",
  "password": "matkhau123",
  "confirmPassword": "matkhau123",
  "fullName": "Nguyễn An",
  "phone": "0912345678",
  "address": "12 Nguyễn Trãi, Hà Nội"
}
```

Mật khẩu tối thiểu 6 ký tự; số điện thoại gồm 10 chữ số và bắt đầu bằng `0`. Mật khẩu xác nhận phải khớp.

### `POST /api/auth/login` — đăng nhập

Quyền: công khai. Ví dụ body:

```json
{"email":"khach@example.com","password":"matkhau123"}
```

Response có access token; dùng token đó cho các API cần xác thực.

### `POST /api/auth/logout` — đăng xuất

Quyền: khách, nhân viên, admin. Gửi JWT trong `Authorization`. Response thông báo đăng xuất; token bị thu hồi.

## Danh mục và dịch vụ

Các API đọc danh mục/dịch vụ yêu cầu đăng nhập. Khách và nhân viên chỉ thấy dữ liệu đang hoạt động; admin quản lý được cả dữ liệu ngừng hoạt động. Chỉ admin được thêm, sửa, đổi trạng thái hoặc xóa.

### Danh mục `/api/categories`

| Method và đường dẫn | Chức năng | Body / tham số |
|---|---|---|
| `GET /api/categories` | Danh sách danh mục | Admin có thể lọc `?status=ACTIVE` hoặc `INACTIVE` |
| `GET /api/categories/{id}` | Chi tiết danh mục | `{id}` là mã danh mục |
| `POST /api/categories` | Tạo danh mục | `{"name":"Điện thoại"}` |
| `PUT /api/categories/{id}` | Đổi tên danh mục | `{"name":"Laptop"}` |
| `PATCH /api/categories/{id}/status` | Bật/tắt danh mục | `{"status":"INACTIVE"}` hoặc `{"status":"ACTIVE"}` |
| `DELETE /api/categories/{id}` | Xóa danh mục nếu không còn được tham chiếu | Không có body |

Ngừng hoạt động danh mục sẽ làm các dịch vụ đang hoạt động trong danh mục đó không còn khả dụng để đặt lịch. Nếu danh mục/dịch vụ đang được lịch hoặc phiếu sử dụng, xóa có thể bị từ chối; hãy dùng API trạng thái để ẩn.

### Dịch vụ `/api/services`

| Method và đường dẫn | Chức năng | Body / tham số |
|---|---|---|
| `GET /api/services` | Danh sách dịch vụ | Bộ lọc tùy chọn `keyword`, `status`, `categoryId` |
| `GET /api/services/{id}` | Chi tiết dịch vụ | `{id}` là mã dịch vụ |
| `POST /api/services` | Tạo dịch vụ | Ví dụ bên dưới |
| `PUT /api/services/{id}` | Cập nhật dịch vụ | Cùng cấu trúc body tạo |
| `PATCH /api/services/{id}/status` | Bật/tắt dịch vụ | `{"status":"INACTIVE"}` hoặc `{"status":"ACTIVE"}` |
| `DELETE /api/services/{id}` | Xóa nếu không được tham chiếu | Không có body |

Body tạo/cập nhật:

```json
{
  "name": "Thay màn hình điện thoại",
  "categoryId": 1,
  "price": 450000,
  "description": "Giá tham khảo, báo giá sau khi kiểm tra"
}
```

`price` không âm, tối đa 2 chữ số thập phân. Chỉ dịch vụ thuộc danh mục đang hoạt động được đặt lịch.

## Lịch hẹn

### `GET /api/appointments/availability?date=2026-11-01&time=09:00`

Quyền: mọi vai trò đã đăng nhập. Kiểm tra chỗ trống cho ngày/giờ (ngày giờ phải ở tương lai). Response cho biết khung giờ còn nhận lịch hay đã đủ năng lực.

### `POST /api/appointments` — khách tạo lịch

Quyền: khách, nhân viên, admin. Khách tạo cho tài khoản của mình; nhân viên/admin có thể tạo thay khách bằng `customerId`.

```json
{
  "device": "iPhone 13",
  "serviceId": 1,
  "appointmentDate": "2026-11-01",
  "appointmentTime": "09:00",
  "serviceMethod": "STORE_DROP_OFF",
  "contactPhone": "0912345678",
  "problemDescription": "Màn hình bị sọc xanh",
  "pickupAddress": null
}
```

`serviceMethod` nhận `STORE_DROP_OFF` (mang tới cửa hàng) hoặc `HOME_PICKUP` (nhận tại nhà). Với `HOME_PICKUP`, gửi địa chỉ nhận tại nhà trong `pickupAddress`. Ngày không được ở quá khứ; giờ phải là khung giờ được hệ thống chấp nhận và còn chỗ. Lịch mới là `PENDING`, chưa phải lịch đã xác nhận.

### `GET /api/appointments/me` — lịch của khách hiện tại

Quyền: khách. Không nhận tham số.

### `GET /api/appointments/pending` — lịch chờ xác nhận

Quyền: nhân viên, admin. Trả danh sách lịch `PENDING` để xử lý.

### `GET /api/appointments/assigned/me` — lịch được giao cho nhân viên hiện tại

Quyền: nhân viên. Không nhận tham số.

### `GET /api/appointments` — tra cứu toàn bộ lịch

Quyền: admin. Có thể lọc bằng `date=2026-11-01`, `status=PENDING` và/hoặc `contactPhone=0912345678`.

### `PUT /api/appointments/{id}` — khách sửa lịch của mình

Quyền: khách, chỉ chủ lịch và lịch còn ở trạng thái cho phép sửa. Gửi đầy đủ các trường như khi tạo; ví dụ:

```json
{
  "device":"iPhone 13",
  "serviceId":1,
  "appointmentDate":"2026-11-02",
  "appointmentTime":"10:00",
  "serviceMethod":"STORE_DROP_OFF",
  "contactPhone":"0912345678",
  "problemDescription":"Màn hình bị sọc xanh",
  "pickupAddress":null
}
```

### `DELETE /api/appointments/{id}` — khách hủy lịch chờ

Quyền: khách, chỉ chủ lịch. Dùng cho lịch còn `PENDING`; response `204 No Content`. Lịch đã xác nhận phải dùng yêu cầu hủy bên dưới.

### `POST /api/appointments/{id}/cancellation-request` — khách xin hủy lịch đã xác nhận

Quyền: khách, chỉ chủ lịch. Body:

```json
{"reason":"Tôi không thể đến cửa hàng vào ngày đã hẹn"}
```

Lý do bắt buộc, tối đa 1000 ký tự. Nhân viên được phân công hoặc admin cần duyệt yêu cầu.

### `GET /api/appointments/cancellation-requests` — danh sách yêu cầu hủy

Quyền: nhân viên, admin. Nhân viên chỉ thấy yêu cầu thuộc lịch được giao cho mình; admin xem toàn bộ.

### `PATCH /api/appointments/{id}/cancellation` — duyệt/từ chối hủy

Quyền: nhân viên được phân công hoặc admin. Body:

```json
{"decision":"APPROVE"}
```

`decision` nhận `APPROVE` hoặc `REJECT`. Duyệt sẽ hủy lịch và phiếu sửa chữa liên quan. Từ chối giữ lịch ở trạng thái đã xác nhận. Không xử lý được sau khi thiết bị đã tiếp nhận.

### `PATCH /api/appointments/{id}/assign` — xác nhận và phân công

Quyền: nhân viên hoặc admin. Không có body. Nhân viên tự nhận lịch; admin để hệ thống chọn kỹ thuật viên đang ít việc. Lịch phải đang chờ xác nhận. Thành công chuyển lịch sang `CONFIRMED` và tạo phiếu sửa chữa `SCHEDULED`.

## Hồ sơ khách hàng

### `GET /api/customers/me` và `PUT /api/customers/me`

Quyền: khách. GET lấy hồ sơ của tài khoản hiện tại; PUT cập nhật hồ sơ. Body theo `CustomerRequest`:

```json
{
  "customerCode":"KH0001",
  "fullName":"Nguyễn An",
  "email":"khach@example.com",
  "password":"matkhau_moi",
  "phone":"0912345678",
  "address":"12 Nguyễn Trãi, Hà Nội"
}
```

Các trường hồ sơ bắt buộc trong DTO gồm `customerCode`, tên, email, số điện thoại và địa chỉ. `password` có thể bỏ qua khi không đổi; nếu gửi phải dài ít nhất 6 ký tự. Khi cập nhật `/me`, mã khách hàng không phải thông tin để tự đổi.

### `GET /api/customers?keyword=An&status=ACTIVE` — tìm khách hàng

Quyền: nhân viên, admin. Cả hai bộ lọc đều tùy chọn.

### `GET /api/customers/{id}` — xem khách hàng

Quyền: nhân viên, admin.

### `POST /api/customers` — nhân viên/admin tạo hồ sơ khách

Quyền: nhân viên, admin. Body dùng cùng cấu trúc `CustomerRequest`; mật khẩu cần có khi tạo tài khoản.

### `PUT /api/customers/{id}` — cập nhật hồ sơ khách

Quyền: admin. Body dùng cùng cấu trúc `CustomerRequest`.

### `PATCH /api/customers/{id}/status` — đổi trạng thái khách

Quyền: admin. Body `{"status":"LOCKED"}` hoặc `{"status":"ACTIVE"}`.

## Hồ sơ nhân viên

### `GET /api/employees/me` và `PUT /api/employees/me`

Quyền: nhân viên. GET xem hồ sơ của mình. PUT cập nhật tên, email, số điện thoại; mật khẩu là tùy chọn.

```json
{
  "fullName":"Trần Bình",
  "email":"binh@example.com",
  "phone":"0987654321",
  "password":"matkhau_moi"
}
```

### `GET /api/employees?keyword=Bình` — tìm nhân viên

Quyền: admin; `keyword` tùy chọn.

### `GET /api/employees/{id}` — xem nhân viên

Quyền: admin.

### `POST /api/employees` — tạo nhân viên

Quyền: admin. Body:

```json
{
  "employeeCode":"NV0001",
  "fullName":"Trần Bình",
  "phone":"0987654321",
  "email":"binh@example.com",
  "password":"matkhau123"
}
```

### `PUT /api/employees/{id}` — sửa nhân viên

Quyền: admin. Gửi các trường `employeeCode`, `fullName`, `phone`, `email`; mật khẩu có thể bỏ qua nếu không đổi.

### `PATCH /api/employees/{id}/status` — khóa/mở nhân viên

Quyền: admin. Body `{"status":"LOCKED"}` hoặc `{"status":"ACTIVE"}`.

### `DELETE /api/employees/{id}` — xóa nhân viên

Quyền: admin. Không có body; có thể bị từ chối nếu nhân viên còn được tham chiếu bởi nghiệp vụ.

## Phiếu sửa chữa

`id` trong các đường dẫn là mã phiếu sửa chữa. Khách chỉ xem được phiếu của mình; nhân viên xem/xử lý phiếu được phân công; admin có quyền quản trị. Tạo lịch và xác nhận lịch là cách thông thường để tạo phiếu. API tạo phiếu trực tiếp chỉ dành cho admin.

### `GET /api/repair-tickets?keyword=iPhone` — tìm phiếu

Quyền: nhân viên, admin. Nhân viên chỉ thấy phạm vi được phân công; `keyword` tùy chọn.

### `GET /api/repair-tickets/history/me` — lịch sử sửa chữa của khách

Quyền: khách. Trả các phiếu của tài khoản đang đăng nhập.

### `GET /api/repair-tickets/{id}` — chi tiết phiếu

Quyền: khách chủ phiếu, nhân viên được giao, admin.

### `POST /api/repair-tickets` — tạo phiếu trực tiếp

Quyền: admin. Luồng đặt lịch thông thường không cần gọi endpoint này. Body:

```json
{
  "customerId":1,
  "device":"iPhone 13",
  "receivedDate":"2026-11-01",
  "status":"SCHEDULED",
  "note":"Khách đặt lịch",
  "technicianId":2,
  "appointmentId":10,
  "serviceId":1
}
```

### `PUT /api/repair-tickets/{id}` — cập nhật thông tin phiếu

Quyền: nhân viên được giao hoặc admin. Body cùng cấu trúc tạo phiếu. Trạng thái vẫn phải tuân thủ kiểm tra nghiệp vụ; dùng intake, diagnosis, báo giá và cập nhật trạng thái chuyên dụng cho luồng thông thường.

### `GET /api/repair-tickets/{id}/history` — lịch sử thao tác phiếu

Quyền: khách chủ phiếu, nhân viên được giao, admin.

### `POST /api/repair-tickets/{id}/intake` — tiếp nhận thiết bị

Quyền: nhân viên được giao hoặc admin. Chỉ thực hiện khi phiếu đang chờ tiếp nhận (`SCHEDULED`); thành công ghi biên nhận và chuyển phiếu sang `RECEIVED`.

```json
{
  "serialNumber":"SN123456",
  "appearanceCondition":"Mặt kính nứt góc trái, máy vẫn lên nguồn",
  "includedAccessories":"Ốp lưng",
  "customerReportedIssue":"Màn hình bị sọc xanh",
  "intakeNote":"Đã xác nhận ngoại quan với khách"
}
```

`appearanceCondition` bắt buộc; các trường còn lại tùy chọn.

### `GET /api/repair-tickets/{id}/intake` — xem biên nhận tiếp nhận

Quyền: khách chủ phiếu, nhân viên được giao, admin.

### `PUT /api/repair-tickets/{id}/diagnosis` — lưu/chỉnh chẩn đoán

Quyền: nhân viên được giao hoặc admin. Sau khi tiếp nhận, gửi:

```json
{
  "diagnosisResult":"Tấm nền màn hình hỏng, các chức năng khác hoạt động bình thường",
  "repairProposal":"Thay cụm màn hình",
  "technicalNote":"Đã kiểm tra cảm ứng và camera"
}
```

Kết quả và phương án sửa bắt buộc; ghi nhận chẩn đoán chuyển phiếu sang bước chờ báo giá.

### `GET /api/repair-tickets/{id}/diagnosis` — xem chẩn đoán

Quyền: khách chủ phiếu, nhân viên được giao, admin.

### `POST /api/repair-tickets/{ticketId}/quote` — lập báo giá

Quyền: nhân viên được giao hoặc admin. Thường gọi sau khi lưu chẩn đoán. Có từ 1 đến 100 hạng mục; tổng tiền được tính từ số lượng nhân với đơn giá.

```json
{
  "items":[
    {"name":"Cụm màn hình","quantity":1,"unitPrice":1800000},
    {"name":"Công thay thế","quantity":1,"unitPrice":250000}
  ]
}
```

### `GET /api/repair-tickets/{ticketId}/quote` — xem báo giá

Quyền: khách chủ phiếu, nhân viên được giao, admin.

### `PATCH /api/quotes/{quoteId}/decision` — khách quyết định báo giá

Quyền: khách sở hữu phiếu. Body:

```json
{"decision":"ACCEPTED"}
```

`decision` chỉ nhận `ACCEPTED` hoặc `REJECTED`. Khách chỉ quyết định báo giá đang chờ phản hồi; chấp nhận cho phép sửa, từ chối kết thúc phiếu với trạng thái `CUSTOMER_DECLINED`.

### `PATCH /api/repair-tickets/{id}/status` — cập nhật tiến độ có ảnh

Quyền: nhân viên được giao hoặc admin. Gửi `multipart/form-data`, không phải JSON:

| Tên phần | Nội dung |
|---|---|
| `status` | Trạng thái đích hợp lệ, ví dụ `WAITING_FOR_PARTS`, `REPAIRING`, `COMPLETED`, `CANNOT_BE_REPAIRED` |
| `note` | Ghi chú tiến độ, tùy chọn |
| `images` | 1–5 ảnh JPEG/PNG, mỗi ảnh tối đa 5 MB; lặp lại key `images` cho nhiều ảnh |

Ví dụ cURL:

```bash
curl -X PATCH "http://localhost:8080/api/repair-tickets/10/status" \
  -H "Authorization: Bearer <accessToken>" \
  -F "status=WAITING_FOR_PARTS" \
  -F "note=Đang chờ linh kiện màn hình" \
  -F "images=@tinh-trang-may.jpg"
```

Không nhập tùy ý trạng thái. Phải theo chuyển trạng thái hợp lệ và có ảnh cho mỗi lần cập nhật. Dùng intake cho `RECEIVED`, diagnosis/báo giá cho bước chẩn đoán và chờ khách duyệt, endpoint quyết định báo giá cho `CUSTOMER_DECLINED`. `REPAIRING` được bắt đầu sau khi khách đồng ý báo giá (hoặc theo luồng chờ linh kiện được backend cho phép).

### `GET /api/repair-tickets/{id}/tracking` — theo dõi tiến độ

Quyền: khách chủ phiếu, nhân viên được giao, admin. Trả trạng thái hiện tại, ghi chú và ảnh các lần cập nhật.

## Thanh toán

### `POST /api/repair-tickets/{ticketId}/payments` — khách khởi tạo thanh toán

Quyền: khách sở hữu phiếu. Body:

```json
{"method":"BANK_TRANSFER"}
```

`method` nhận `BANK_TRANSFER` hoặc `CASH`. Tạo yêu cầu thanh toán không tự xác nhận đã thu tiền.

### `GET /api/repair-tickets/{ticketId}/payments` — lịch sử thanh toán

Quyền: khách sở hữu phiếu, nhân viên được giao, admin.

### `PATCH /api/payments/{paymentId}/confirm` — xác nhận đã nhận tiền

Quyền: nhân viên được giao hoặc admin. Không có body. Chỉ gọi sau khi tiền đã được nhận/xác minh (hoặc từ callback thanh toán đáng tin cậy).

## Lỗi thường gặp

- `400`: body sai định dạng, thiếu trường bắt buộc, enum không hợp lệ hoặc vi phạm quy tắc trạng thái.
- `401`: thiếu JWT, JWT sai/hết hạn/đã đăng xuất.
- `403`: tài khoản không có vai trò phù hợp hoặc không sở hữu phiếu/lịch, không được phân công xử lý.
- `404`: không tìm thấy bản ghi.
- `409`: xung đột nghiệp vụ, chẳng hạn lịch/khung giờ không còn phù hợp hoặc bản ghi đang được sử dụng.

## Chạy ứng dụng

Chạy backend local bằng cấu hình mặc định `local`; cơ sở dữ liệu phải chạy và thông tin kết nối phải đúng. Local profile có giá trị JWT mặc định để tiện phát triển; chỉ dùng local/demo, không dùng khóa mặc định khi triển khai thật. Có thể ghi đè bằng biến môi trường `JWT_SECRET` (khóa đủ dài, tối thiểu 32 ký tự).

Với Docker, dùng như trước:

```bash
docker compose up --build
```

Compose dùng thông tin MySQL trong `.env`; giữ các biến DB hiện tại. `JWT_SECRET` là khóa bí mật ký và xác minh JWT, không phải mật khẩu MySQL. FE không cần tự tạo hay gửi giá trị này; FE chỉ gửi access token do API đăng nhập trả về. Khi đưa ứng dụng lên môi trường thật, đặt `JWT_SECRET` riêng và đủ mạnh trong cấu hình triển khai, không commit khóa thật lên Git.

Swagger UI: `http://localhost:8080/swagger-ui/index.html`.
