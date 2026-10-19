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

## 1. Khởi động backend

Backend mặc định chạy tại `http://localhost:8080`.

### Chạy từ IntelliJ

Trong **Run → Edit Configurations…**, chọn cấu hình Spring Boot và đặt biến môi trường:

```text
ADMIN_EMAIL=admin@repair.local;ADMIN_PASSWORD=<mật-khẩu-admin>
```

Chạy ứng dụng. Khi backend khởi động, tài khoản admin được tạo nếu email đó chưa có trong database. Nếu tài khoản đã tồn tại, ứng dụng không tự đổi mật khẩu.

### Chạy bằng Docker Compose

Trong PowerShell, đặt mật khẩu rồi khởi động Compose:

```powershell
$env:ADMIN_PASSWORD = "<mật-khẩu-admin>"
docker compose up --build
```

Email mặc định là `admin@repair.local`; có thể đặt thêm `$env:ADMIN_EMAIL` trước khi chạy. `compose.yaml` chuyển các biến này vào backend. Database Docker có volume riêng, nên tài khoản tạo khi chạy IntelliJ không tự xuất hiện trong database Docker.

Không ghi mật khẩu thật vào README, `compose.yaml` hoặc commit Git. Nếu admin đã tồn tại, thay `ADMIN_PASSWORD` không đặt lại mật khẩu hiện tại.

## 2. Dùng Swagger UI

Sau khi backend chạy, mở:

```text
http://localhost:8080/swagger-ui/index.html
```

Đăng ký và đăng nhập không cần token. Với API cần đăng nhập, gọi login trước, bấm **Authorize**, nhập token nhận được (không cần tự thêm `Bearer `), rồi gọi endpoint.

## 3. Đăng ký tài khoản khách hàng

**POST** `/api/auth/register`

Body → raw → JSON:

```json
{
  "email": "khach@example.com",
  "password": "Khach123",
  "confirmPassword": "Khach123",
  "fullName": "Nguyen Van An",
  "phone": "0901234567",
  "address": "Ho Chi Minh"
}
```

Thành công: `201 Created`. Đăng ký tạo role `CUSTOMER`. Email phải hợp lệ, mật khẩu tối thiểu 6 ký tự, số điện thoại gồm 10 chữ số và bắt đầu bằng `0`; `password` và `confirmPassword` phải giống nhau.

## 4. Đăng nhập

**POST** `/api/auth/login`

```json
{
  "email": "admin@repair.local",
  "password": "<mật-khẩu-admin>"
}
```

Đăng nhập customer hoặc employee cũng dùng endpoint này, với email/mật khẩu tương ứng.

Response thành công có dạng:

```json
{
  "token": "<jwt>",
  "tokenType": "Bearer",
  "id": 1,
  "email": "admin@repair.local",
  "role": "ADMIN",
  "message": "Đăng nhập thành công"
}
```

Giữ `token` để gọi API được bảo vệ bằng header:

```http
Authorization: Bearer <jwt>
```

FE có thể dùng `role` để chọn giao diện phù hợp; backend vẫn là nơi kiểm tra quyền thực tế.

## 5. Tạo và quản lý tài khoản nhân viên

Các endpoint nhân viên yêu cầu role `ADMIN`. Đăng nhập admin trước và gửi token Bearer.

### Tạo nhân viên

**POST** `/api/employees`

```json
{
  "employeeCode": "NV0001",
  "fullName": "Tran Van Binh",
  "phone": "0912345678",
  "email": "nhanvien@example.com",
  "password": "NhanVien123"
}
```

Backend tạo tài khoản đăng nhập với role `EMPLOYEE`. Nhân viên dùng `POST /api/auth/login` để đăng nhập.

### Các endpoint quản lý nhân viên

| Method | Endpoint | Chức năng |
|---|---|---|
| `GET` | `/api/employees` | Danh sách nhân viên; có thể lọc bằng `?keyword=...` |
| `GET` | `/api/employees/{id}` | Xem nhân viên theo ID |
| `POST` | `/api/employees` | Tạo nhân viên và tài khoản đăng nhập |
| `PUT` | `/api/employees/{id}` | Sửa thông tin nhân viên/tài khoản |
| `PATCH` | `/api/employees/{id}/status` | Đổi trạng thái hoạt động/khóa |
| `DELETE` | `/api/employees/{id}` | Xóa nhân viên và tài khoản liên kết |

Body của `PUT` cần có `employeeCode`, `fullName`, `phone`, `email`. Để giữ mật khẩu hiện tại, bỏ trường `password` hoặc gửi `null`; muốn đổi thì gửi mật khẩu mới. `employeeCode` hiện là trường bắt buộc trong request cập nhật.

## 6. Xem và sửa hồ sơ khách hàng

Customer chỉ được truy cập hồ sơ gắn với tài khoản đang đăng nhập. Dùng token customer.

**GET** `/api/customers/me` — xem hồ sơ của mình.

**PUT** `/api/customers/me` — cập nhật hồ sơ của mình. Gửi đủ các trường bắt buộc, ví dụ:

```json
{
  "customerCode": "KH000001",
  "fullName": "Nguyen Van An",
  "email": "khach@example.com",
  "phone": "0901234567",
  "address": "Dia chi moi"
}
```

Để đổi mật khẩu, thêm trường `password` với mật khẩu mới tối thiểu 6 ký tự. Không gửi trường này nếu không muốn đổi mật khẩu. Nếu đổi email, hãy đăng nhập lại để nhận JWT với email mới.

## 7. Đăng xuất

**POST** `/api/auth/logout`

Gửi token Bearer hiện tại. Thành công trả `200 OK`; token được đưa vào blacklist và không dùng lại được. Đăng nhập lại để lấy token mới.

## 8. Quyền truy cập tóm tắt

- `ADMIN`: được gọi mọi API.
- `EMPLOYEE`: xử lý lịch/phiếu được giao và báo giá, tiến độ, thanh toán liên quan; API quản lý nhân viên yêu cầu `ADMIN`.
- `CUSTOMER`: xem dịch vụ/danh mục, đặt lịch, xem lịch sử, quản lý hồ sơ `/api/customers/me`, và thao tác báo giá/thanh toán trên dữ liệu của chính mình.
- Đăng ký và đăng nhập là public; logout cần đăng nhập. API khác bị từ chối nếu role không được cấp.

## 9. Mã lỗi thường gặp

- `400 Bad Request`: dữ liệu thiếu/sai định dạng hoặc validation không đạt.
- `401 Unauthorized`: email/mật khẩu sai, thiếu token hoặc token hết hạn/không hợp lệ.
- `403 Forbidden`: token hợp lệ nhưng role không có quyền, hoặc customer truy cập dữ liệu của người khác.
- `409 Conflict`: email hoặc số điện thoại đã được sử dụng.

Mật khẩu không được API trả về; backend lưu mật khẩu bằng BCrypt.

## 10. Dùng API nghiệp vụ: đặt lịch, dịch vụ và sửa chữa

Phần này mô tả luồng API hiện có trong backend. Base URL mặc định là http://localhost:8080. Ví dụ dưới đây giả định Postman có Environment với biến baseUrl = http://localhost:8080.

### 10.1. Đăng nhập và gửi token

Đăng nhập bằng POST {{baseUrl}}/api/auth/login:

~~~json
{
  "email": "email-dang-nhap",
  "password": "mat-khau"
}
~~~

Sao chép trường token từ response. Với mỗi request cần đăng nhập, chọn Authorization → Bearer Token rồi dán token. Có ba vai trò:

| Vai trò | Dùng cho |
|---|---|
| CUSTOMER | Đặt lịch, xem lịch và phiếu của mình, duyệt báo giá, tạo và xem thanh toán của mình |
| EMPLOYEE | Xem lịch; xử lý phiếu, báo giá, ảnh tiến độ và thanh toán của những phiếu được giao cho mình |
| ADMIN | Quản lý danh mục/dịch vụ, xem và xử lý toàn bộ dữ liệu, phân công lịch |

Đăng ký public tạo tài khoản CUSTOMER. Tài khoản EMPLOYEE do admin tạo; tài khoản ADMIN được cấu hình khi chạy ứng dụng.

### 10.2. Quản lý danh mục và dịch vụ

Khách và nhân viên chỉ cần đọc danh mục/dịch vụ đang hoạt động để chọn dịch vụ khi đặt lịch. Chỉ admin được tạo, sửa, bật/tắt hoặc xóa.

#### Danh mục

| Method | URL | Quyền | Tác dụng |
|---|---|---|---|
| GET | /api/categories | CUSTOMER, EMPLOYEE, ADMIN | Liệt kê; thêm ?status=ACTIVE hoặc INACTIVE để lọc |
| GET | /api/categories/{categoryId} | CUSTOMER, EMPLOYEE, ADMIN | Xem chi tiết |
| POST | /api/categories | ADMIN | Tạo danh mục |
| PUT | /api/categories/{categoryId} | ADMIN | Đổi tên |
| PATCH | /api/categories/{categoryId}/status | ADMIN | Đảo trạng thái ACTIVE/INACTIVE; không có body |
| DELETE | /api/categories/{categoryId} | ADMIN | Xóa nếu chưa được dịch vụ nào sử dụng |

Tạo danh mục — POST /api/categories, Body raw JSON:

~~~json
{
  "name": "Sửa chữa điện thoại"
}
~~~

Tên là bắt buộc và không được trùng tên danh mục khác.

#### Dịch vụ

| Method | URL | Quyền | Tác dụng |
|---|---|---|---|
| GET | /api/services | CUSTOMER, EMPLOYEE, ADMIN | Liệt kê và lọc |
| GET | /api/services/{serviceId} | CUSTOMER, EMPLOYEE, ADMIN | Xem chi tiết |
| POST | /api/services | ADMIN | Tạo dịch vụ |
| PUT | /api/services/{serviceId} | ADMIN | Cập nhật thông tin |
| PATCH | /api/services/{serviceId}/status | ADMIN | Đảo trạng thái ACTIVE/INACTIVE; không có body |
| DELETE | /api/services/{serviceId} | ADMIN | Xóa dịch vụ |

GET /api/services hỗ trợ query params keyword, status và categoryId. Ví dụ: GET {{baseUrl}}/api/services?status=ACTIVE&categoryId=1.

Tạo dịch vụ — POST /api/services:

~~~json
{
  "name": "Thay màn hình điện thoại",
  "categoryId": 1,
  "price": 1500000,
  "description": "Giá tham khảo, báo giá cuối cùng được lập sau khi kiểm tra máy"
}
~~~

name, categoryId và price là bắt buộc; price phải lớn hơn hoặc bằng 0. Mã dịch vụ và trạng thái ACTIVE do backend tạo. Danh mục phải tồn tại và đang hoạt động. PUT dùng cùng cấu trúc; categoryId phải là danh mục đang hoạt động nếu chuyển dịch vụ sang danh mục khác.

### 10.3. Khách đặt lịch sửa chữa

Đảm bảo dịch vụ khách chọn đang ACTIVE. Khách gọi POST {{baseUrl}}/api/appointments với Bearer Token CUSTOMER, Body raw JSON:

~~~json
{
  "device": "iPhone 13",
  "serviceId": 1,
  "appointmentDate": "2026-10-20",
  "appointmentTime": "14:30:00",
  "serviceMethod": "STORE_DROP_OFF",
  "contactPhone": "0912345678",
  "problemDescription": "Màn hình bị nứt, cảm ứng vẫn hoạt động",
  "pickupAddress": null
}
~~~

Đầu vào:

- device: bắt buộc, tối đa 200 ký tự.
- serviceId: ID số của dịch vụ ACTIVE.
- appointmentDate: ngày hiện tại hoặc ngày tương lai, định dạng YYYY-MM-DD.
- appointmentTime: giờ dạng HH:mm:ss.
- serviceMethod: STORE_DROP_OFF hoặc HOME_PICKUP.
- contactPhone: số điện thoại 10 chữ số bắt đầu bằng 0.
- problemDescription: bắt buộc, tối đa 5000 ký tự.
- pickupAddress: tối đa 500 ký tự; bắt buộc khi serviceMethod là HOME_PICKUP.

Khi khách đặt lịch, backend gắn lịch với tài khoản khách, tự chọn kỹ thuật viên ACTIVE đang có ít việc nhất và tránh người đã có lịch trùng ngày/giờ. Response 201 trả appointment id, trạng thái CONFIRMED, dịch vụ và kỹ thuật viên được giao. Không gửi appointment id hoặc technician id khi tạo lịch; backend tự sinh/chọn.

Công việc lịch hẹn đã được giao cho nhân viên: GET {{baseUrl}}/api/appointments/assigned/me (Bearer Token EMPLOYEE). API chỉ trả lịch gán cho tài khoản đang đăng nhập, kèm thông tin khách, dịch vụ, thiết bị, ngày giờ, hình thức nhận máy và mô tả sự cố. Phiếu sửa chữa được tạo tự động cùng lúc với việc phân công; nhân viên dùng GET {{baseUrl}}/api/repair-tickets để xem phiếu được giao.

Lịch của khách:

- GET {{baseUrl}}/api/appointments/me — CUSTOMER xem lịch của mình.
- PUT {{baseUrl}}/api/appointments/{appointmentId} — CUSTOMER sửa lịch PENDING của mình; body giống lúc tạo.
- DELETE {{baseUrl}}/api/appointments/{appointmentId} — CUSTOMER hủy lịch PENDING của mình.

Lưu ý: lịch đặt bởi CUSTOMER được xác nhận/phân công ngay nên đã ở trạng thái CONFIRMED; endpoint sửa/hủy hiện chỉ cho lịch PENDING. Nhân viên/admin xem tất cả lịch bằng GET {{baseUrl}}/api/appointments; có thể lọc bằng ?contactPhone=0912345678. Admin có thể gọi PATCH {{baseUrl}}/api/appointments/{appointmentId}/assign cho lịch PENDING; endpoint tự gán kỹ thuật viên ít việc nhất, không cần body.

### 10.4. Nhân viên xem phiếu sửa chữa được giao

Khi khách CUSTOMER đặt lịch thành công, backend tự chọn kỹ thuật viên ACTIVE ít việc nhất và tự tạo phiếu sửa chữa trong cùng luồng. Response đặt lịch vẫn có appointment id; phiếu có repairTicket id riêng. Phiếu mới có status SCHEDULED, được gắn với khách hàng, dịch vụ và kỹ thuật viên từ lịch. Không cần gọi POST /api/repair-tickets để tạo lại phiếu cho lịch mới.

Nhân viên xem lịch làm việc, gồm ngày giờ, hình thức nhận máy, địa chỉ lấy máy và mô tả lỗi:

GET {{baseUrl}}/api/appointments/assigned/me — Bearer Token EMPLOYEE.

Nhân viên xem phiếu được giao để lập báo giá và cập nhật tiến độ:

GET {{baseUrl}}/api/repair-tickets — Bearer Token EMPLOYEE. Dùng trường id trong response làm {ticketId} cho các API báo giá, tiến độ, thanh toán và theo dõi. Không nhầm với id của lịch hẹn.

EMPLOYEE hoặc ADMIN vẫn có thể tạo phiếu thủ công bằng POST {{baseUrl}}/api/repair-tickets; ví dụ có thể tạo từ lịch CONFIRMED cũ chưa có phiếu. Lịch mới khách vừa đặt đã tự có phiếu nên không gọi POST lần nữa. Ví dụ:

~~~json
{
  "appointmentId": 12,
  "device": "iPhone 13",
  "receivedDate": "2026-10-20",
  "status": "SCHEDULED"
}
~~~

Lịch cũ đã có phiếu thì không tạo thêm phiếu. Phiếu tạo riêng không gắn lịch vẫn hỗ trợ qua POST với customerId, device, receivedDate, status; technicianId và serviceId tùy chọn.

Tra cứu phiếu:

| Request | Quyền và kết quả |
|---|---|
| GET /api/repair-tickets | EMPLOYEE chỉ nhận phiếu được giao cho mình; ADMIN nhận tất cả |
| GET /api/repair-tickets?keyword=PS00012 | Lọc theo mã phiếu, tên/mã khách hoặc số điện thoại; vẫn áp dụng phạm vi nhân viên |
| GET /api/repair-tickets/{ticketId} | EMPLOYEE chỉ xem phiếu được giao; ADMIN xem mọi phiếu |
| GET /api/repair-tickets/history/me | CUSTOMER xem lịch sử của mình |
| GET /api/repair-tickets/{ticketId}/tracking | CUSTOMER xem phiếu của mình; EMPLOYEE xem phiếu được giao; ADMIN xem mọi phiếu |

Nhân viên khác gọi ID phiếu không được giao cho mình sẽ nhận 403. Admin có thể đổi người phụ trách bằng PUT phiếu. PUT /api/repair-tickets/{ticketId} không dùng để đổi status; đổi trạng thái phải dùng API kèm ảnh ở mục 10.6.
### 10.5. Lập và duyệt báo giá

Chỉ nhân viên đang được giao phiếu hoặc admin lập báo giá. Mỗi phiếu chỉ có một báo giá.

POST {{baseUrl}}/api/repair-tickets/{ticketId}/quote:

~~~json
{
  "items": [
    {
      "name": "Thay màn hình",
      "quantity": 1,
      "unitPrice": 1500000
    },
    {
      "name": "Công sửa chữa",
      "quantity": 1,
      "unitPrice": 200000
    }
  ]
}
~~~

items phải có ít nhất một phần tử. Mỗi phần tử cần name, quantity là số nguyên dương và unitPrice không âm. Backend tính lineTotal = quantity × unitPrice và totalAmount; mã báo giá được backend sinh. Phiếu chuyển sang trạng thái chờ khách xác nhận.

Xem báo giá — GET {{baseUrl}}/api/repair-tickets/{ticketId}/quote. Khách chỉ xem báo giá của phiếu mình; nhân viên chỉ xem nếu được giao phiếu; admin xem tất cả.

Khách quyết định — PATCH {{baseUrl}}/api/quotes/{quoteId}/decision:

~~~json
{
  "decision": "ACCEPTED"
}
~~~

decision chỉ nhận ACCEPTED hoặc REJECTED. Khách phải là chủ phiếu; nhân viên/admin chỉ thao tác nếu phiếu được giao cho nhân viên đó (admin được toàn quyền). Chỉ báo giá SENT mới quyết định được. Báo giá ACCEPTED cho phép khách tạo thanh toán.

### 10.6. Nhân viên cập nhật tiến độ kèm ảnh

Kỹ thuật viên được giao phiếu cập nhật trạng thái bằng PATCH {{baseUrl}}/api/repair-tickets/{ticketId}/status. Admin cũng có quyền. Chọn Body → form-data:

| Key | Kiểu | Ví dụ |
|---|---|---|
| status | Text | Đang sửa |
| note | Text, không bắt buộc | Đã thay linh kiện, đang kiểm tra máy |
| images | File | Ảnh JPEG hoặc PNG; thêm nhiều dòng cùng key images |

Mỗi lần đổi trạng thái bắt buộc có 1–5 ảnh JPEG/PNG, mỗi ảnh tối đa 5 MB. Backend lưu status, ghi chú, thời gian, người cập nhật và ảnh vào database. Ảnh trả về trong tracking dưới dạng dataUri để FE gán vào thuộc tính src của ảnh. Chỉ kỹ thuật viên được giao phiếu hoặc admin được cập nhật.

### 10.7. Khách thanh toán, nhân viên xác nhận

Khách sở hữu phiếu tạo thanh toán sau khi báo giá ACCEPTED — POST {{baseUrl}}/api/repair-tickets/{ticketId}/payments:

~~~json
{
  "method": "BANK_TRANSFER"
}
~~~

method là BANK_TRANSFER hoặc CASH. Backend lấy số tiền từ tổng báo giá; response tạo payment id, amount và status PENDING. Mỗi báo giá chỉ tạo được một giao dịch.

Xem giao dịch — GET {{baseUrl}}/api/repair-tickets/{ticketId}/payments. Khách chỉ xem phiếu của mình; nhân viên chỉ xem phiếu được giao; admin xem tất cả.

Sau khi nhận/kiểm tra tiền, nhân viên được giao phiếu hoặc admin gọi PATCH {{baseUrl}}/api/payments/{paymentId}/confirm. Không cần body. Giao dịch chuyển PENDING → PAID. Nhân viên khác không được xác nhận giao dịch của phiếu không thuộc mình.

### 10.8. Mã lỗi và thứ tự gọi

Luồng chính:

1. Admin tạo danh mục và dịch vụ ACTIVE.
2. Khách đăng nhập, chọn serviceId và tạo lịch.
3. Backend tự phân công; lịch trả về CONFIRMED và technician.
4. Backend tự tạo phiếu và gắn với nhân viên được phân công.
5. Nhân viên kiểm tra và lập báo giá.
6. Khách xem/duyệt báo giá.
7. Khách theo dõi bằng trackingUrl; nhân viên cập nhật trạng thái kèm ảnh.
8. Khách tạo thanh toán; nhân viên được giao hoặc admin xác nhận đã nhận tiền.

| Mã | Ý nghĩa thường gặp |
|---|---|
| 400 | Thiếu/sai trường, ngày hoặc enum; thiếu ảnh khi đổi trạng thái |
| 401 | Thiếu JWT hoặc JWT không hợp lệ |
| 403 | Sai vai trò; nhân viên không phụ trách phiếu; khách không sở hữu phiếu |
| 404 | Không tìm thấy ID khách, dịch vụ, lịch, phiếu, báo giá hoặc thanh toán |
| 409 | Lịch không còn PENDING, không có nhân viên khả dụng, phiếu đã có báo giá hoặc báo giá chưa ACCEPTED khi thanh toán |

Dùng các id số trong response làm appointmentId, ticketId, quoteId và paymentId. Mã hiển thị như PS00012 hoặc BG000012 không thay thế id trên URL.