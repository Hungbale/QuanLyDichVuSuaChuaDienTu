# Hợp đồng API Sprint 6 (FE ↔ BE)

Frontend lấy địa chỉ gốc từ `VITE_API_URL` (mặc định local: `http://localhost:8080`). API cần Bearer token, trừ các route đăng nhập/đăng ký và kiểm tra slot công khai nếu cấu hình BE cho phép.

| Chức năng | Phương thức và URL | Request | Response chính |
|---|---|---|---|
| Danh sách phiếu sửa chữa | `GET /api/repair-tickets?keyword=` | Query `keyword` tùy chọn | Mảng phiếu; BE giới hạn theo phiếu được giao cho nhân viên đang đăng nhập |
| Tạo phiếu thủ công/liên kết lịch | `POST /api/repair-tickets` | JSON: `customerId`, `device`, `receivedDate`, `status: SCHEDULED`, `technicianId`; hoặc `appointmentId` | Phiếu vừa tạo; với lịch hẹn, BE lấy thông tin/nhân viên từ lịch và đổi lịch sang `CONVERTED` |
| Chi tiết / cập nhật phiếu | `GET /api/repair-tickets/{id}`, `PUT /api/repair-tickets/{id}` | PUT nhận các trường phiếu; không dùng PUT để đổi trạng thái | Phiếu |
| Lịch sử phiếu | `GET /api/repair-tickets/{id}/history` | — | Mảng hoạt động |
| Tiếp nhận thiết bị | `POST /api/repair-tickets/{id}/intake` | `multipart/form-data`: `serialNumber`, `appearanceCondition` (bắt buộc), `includedAccessories`, `customerReportedIssue`, `intakeNote`, 1–5 file `images` (JPEG/PNG, tối đa 5 MB/file) | Biên nhận gồm thông tin tiếp nhận, `receivedAt`, người nhận và `photos[]` (`fileName`, `contentType`, `dataUri`) |
| Xem biên nhận | `GET /api/repair-tickets/{id}/intake` | — | Cùng cấu trúc biên nhận |
| Chẩn đoán | `PUT /api/repair-tickets/{id}/diagnosis` | JSON: `diagnosisResult`, `repairProposal` (bắt buộc), `technicalNote` tùy chọn | Chẩn đoán kèm `ticketStatus`; BE chuyển phiếu sang `Đang kiểm tra` |
| Xem chẩn đoán | `GET /api/repair-tickets/{id}/diagnosis` | — | Bản ghi chẩn đoán; 404 nếu chưa lưu |
| Tạo và gửi báo giá | `POST /api/repair-tickets/{id}/quote` | JSON `{ items: [{ name, quantity, unitPrice }] }` | Báo giá và các hạng mục; BE chuyển phiếu sang `Chờ xác nhận báo giá` |
| Xem báo giá | `GET /api/repair-tickets/{id}/quote` | — | Báo giá; khách chỉ xem báo giá của phiếu mình |
| Khách phản hồi báo giá | `PATCH /api/quotes/{quoteId}/decision` | JSON `{ decision: "ACCEPTED" | "REJECTED" }` | Báo giá đã cập nhật; BE chuyển phiếu sang `Đang sửa` hoặc `Khách từ chối` |
| Cập nhật tiến độ/kết thúc | `PATCH /api/repair-tickets/{id}/status` | `multipart/form-data`: `status`, `note` tùy chọn, 1–5 file `images` | Bản ghi tiến độ kèm ảnh và thời điểm; các cập nhật đều bắt buộc có ảnh |
| Theo dõi tiến độ | `GET /api/repair-tickets/{id}/tracking` | — | `currentStatus`, `updates[]` (ảnh bằng chứng) và `timeline[]` (mốc, nội dung, người thực hiện, thời gian) |
| Lịch của khách | `GET /api/appointments/me` | — | Mảng lịch của tài khoản khách |
| Lịch nhân viên theo nhóm | `GET /api/appointments/assigned/me/groups` | — | `{ actionRequired: [], received: [], other: [] }`; lịch sau tiếp nhận được nhóm riêng |
| Lịch chờ phân công | `GET /api/appointments/pending` | — | Mảng lịch chờ nhận |
| Nhận/phân công lịch | `PATCH /api/appointments/{id}/assign` | — | Lịch đã xác nhận và nhân viên được gán; BE tạo phiếu sửa chữa liên kết |
| Yêu cầu hủy lịch | `POST /api/appointments/{id}/cancellation-request` | JSON `{ reason }` | Yêu cầu hủy |
| Duyệt/từ chối hủy | `GET /api/appointments/cancellation-requests`, `PATCH /api/appointments/{id}/cancellation` | PATCH JSON `{ decision: "APPROVE" | "REJECT" }` | Danh sách/kết quả yêu cầu; lịch đã tiếp nhận không còn được hủy theo luồng này |

BE trả lỗi nghiệp vụ/validation theo JSON `{ "message": "..." }` với HTTP status phù hợp (400, 403, 404, 409, 413, 500). FE hiển thị `message`, sau đó mới dùng nội dung dự phòng khi phản hồi không có trường này.

## Điểm chờ BE

- `POST /api/appointments` hiện tạo lịch ở trạng thái `PENDING`, chưa tự chọn nhân viên hoặc tạo phiếu. Phân công chỉ diễn ra khi nhân viên/admin gọi `PATCH /api/appointments/{id}/assign`. FE vì vậy phản hồi đúng là “đã tiếp nhận yêu cầu”, chưa thể khẳng định lịch đã được phân công.
- SecurityConfig hiện cấp quyền nhân viên cho `GET /api/appointments/assigned/me` nhưng chưa khai báo `GET /api/appointments/assigned/me/groups`; controller có route groups nhưng nhân viên có thể nhận 403. FE đã fallback sang route cũ và tự chia nhóm đến khi BE bổ sung quyền.
- Chưa có API chuyển phiếu `Khách từ chối` sang trạng thái kết thúc riêng. `CUSTOMER_DECLINED` là trạng thái cuối; `PUT` không được đổi trạng thái và `PATCH /status` không cho phép chuyển từ trạng thái này. FE tạm khóa thao tác kết thúc để tránh gửi request chắc chắn thất bại.
- Timeline hiện có mốc tiếp nhận, chẩn đoán, báo giá, quyết định báo giá và cập nhật trạng thái. BE chưa thêm mốc “đặt lịch” vào timeline phiếu.
