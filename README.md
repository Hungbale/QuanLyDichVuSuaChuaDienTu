# Web sửa chữa điện tử – Hướng dẫn API tài khoản


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
- `EMPLOYEE`: được gọi API nghiệp vụ được phân quyền; API quản lý nhân viên yêu cầu `ADMIN`.
- `CUSTOMER`: xem dịch vụ/danh mục, đặt lịch, xem lịch sử, quản lý hồ sơ `/api/customers/me`, và thao tác báo giá/thanh toán trên dữ liệu của chính mình.
- Đăng ký và đăng nhập là public; logout cần đăng nhập. API khác bị từ chối nếu role không được cấp.

## 9. Mã lỗi thường gặp

- `400 Bad Request`: dữ liệu thiếu/sai định dạng hoặc validation không đạt.
- `401 Unauthorized`: email/mật khẩu sai, thiếu token hoặc token hết hạn/không hợp lệ.
- `403 Forbidden`: token hợp lệ nhưng role không có quyền, hoặc customer truy cập dữ liệu của người khác.
- `409 Conflict`: email hoặc số điện thoại đã được sử dụng.

Mật khẩu không được API trả về; backend lưu mật khẩu bằng BCrypt.

## 10. Quản lý dịch vụ

Các API dưới đây dùng base URL `http://localhost:8080`. Cần đăng nhập để lấy JWT rồi gửi header `Authorization: Bearer <token>`. `ADMIN`, `EMPLOYEE` và `CUSTOMER` được xem danh sách/chi tiết; chỉ `ADMIN` được thêm, sửa và xóa dịch vụ.

| Method | Endpoint | Chức năng |
|---|---|---|
| `GET` | `/api/services` | Xem danh sách; lọc tùy chọn bằng `?keyword=...`, `?status=ACTIVE` hoặc `?categoryId=1` |
| `GET` | `/api/services/{id}` | Xem chi tiết dịch vụ |
| `POST` | `/api/services` | Thêm dịch vụ (admin) |
| `PUT` | `/api/services/{id}` | Sửa dịch vụ (admin) |
| `DELETE` | `/api/services/{id}` | Xóa dịch vụ (admin), thành công trả `204 No Content` |

Body dùng cho `POST` và `PUT` (cần `categoryId` của danh mục đang hoạt động):

```json
{
  "name": "Thay quạt laptop",
  "categoryId": 1,
  "price": 150000,
  "description": "Thay quạt tản nhiệt laptop"
}
```

`name` không được để trống; `categoryId` và `price` là bắt buộc; `price` phải lớn hơn hoặc bằng 0. Khi thêm thành công, backend tự tạo `serviceCode` và đặt trạng thái ban đầu là `ACTIVE`.

### Thêm danh mục trước khi thêm dịch vụ

Tất cả request dưới đây dùng base URL `http://localhost:8080` và cần token admin để tạo dữ liệu.

1. Tạo danh mục bằng `POST /api/categories`, gửi Bearer token admin và JSON:

```json
{
  "name": "Sửa chữa laptop"
}
```

Thành công trả `201 Created` cùng danh mục vừa tạo, ví dụ có `id` và `status: "ACTIVE"`. Lưu lại `id` này.

2. Nếu danh mục đã có, có thể tìm ID bằng `GET /api/categories` (cần đăng nhập; có thể lọc `?status=ACTIVE`).

3. Tạo dịch vụ bằng `POST /api/services`, dùng Bearer token admin và đặt `categoryId` bằng ID danh mục ở bước 1 hoặc 2:

```json
{
  "name": "Thay quạt laptop",
  "categoryId": 1,
  "price": 150000,
  "description": "Thay quạt tản nhiệt laptop"
}
```

Người dùng FE sẽ chọn tên danh mục trên giao diện; FE gửi `categoryId` tương ứng trong request, không yêu cầu người dùng tự nhập ID.

## 11. Đặt lịch sửa chữa

Base URL local: `http://localhost:8080`. Đăng nhập trước, sau đó gửi JWT trong header `Authorization: Bearer <token>`. Customer, employee hoặc admin có thể tạo lịch; chỉ employee và admin được xem danh sách lịch.

### Tạo lịch

**POST** `/api/appointments`

`serviceId` phải là ID của dịch vụ đang hoạt động. Có thể lấy danh sách dịch vụ từ `GET /api/services`.

```json
{
  "device": "Laptop Dell Inspiron",
  "serviceId": 1,
  "appointmentDate": "2026-10-20",
  "appointmentTime": "09:30:00",
  "serviceMethod": "STORE_DROP_OFF",
  "contactPhone": "0901234567",
  "problemDescription": "Máy nóng và quạt kêu lớn",
  "pickupAddress": null
}
```

`appointmentDate` dùng định dạng `YYYY-MM-DD` và không được là ngày trong quá khứ. `appointmentTime` dùng định dạng `HH:mm:ss`. `serviceMethod` nhận `STORE_DROP_OFF` (mang máy đến cửa hàng) hoặc `HOME_PICKUP` (nhận máy tại nhà). Với `HOME_PICKUP`, cần điền `pickupAddress`. Số điện thoại phải gồm 10 chữ số và bắt đầu bằng `0`. Thành công trả `201 Created`; trạng thái ban đầu là `PENDING`.

### Xem lịch đã đặt

**GET** `/api/appointments` — employee/admin xem tất cả lịch.

**GET** `/api/appointments?contactPhone=0901234567` — lọc lịch theo số điện thoại liên hệ; endpoint này cũng chỉ dành cho employee/admin.
