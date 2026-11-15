# API báo cáo thống kê

Tất cả API trong tài liệu này chỉ dành cho quản trị viên.

## Xác thực

Đăng nhập bằng tài khoản quản trị viên qua POST /api/auth/login. Gửi token trong header:

    Authorization: Bearer <adminToken>

Base URL mặc định khi chạy local: http://localhost:8080

## Quy tắc chung

- fromDate và toDate là bắt buộc, định dạng yyyy-MM-dd.
- fromDate phải nhỏ hơn hoặc bằng toDate.
- toDate không được lớn hơn ngày hiện tại.
- Khoảng ngày tối đa 366 ngày, tính cả ngày bắt đầu và ngày kết thúc.
- Lỗi tham số ngày trả 400 Bad Request. Không có quyền Admin trả 403 Forbidden.

Các chỉ tiêu được tính như sau:

| key | Ý nghĩa |
|---|---|
| appointments | Số lịch hẹn theo ngày hẹn |
| repairTickets | Số phiếu sửa chữa theo ngày tiếp nhận |
| completedTickets | Số phiếu hoàn thành theo ngày hoàn thành |
| revenue | Tổng giao dịch đã thanh toán theo thời điểm thanh toán |
| averageRating | Điểm đánh giá trung bình trong khoảng ngày, thang 5 |

Nếu kỳ chưa có đánh giá, averageRating là null và lý do được ghi trong unavailableMetrics. Breakdown trạng thái phản ánh trạng thái hiện tại của các lịch hẹn và phiếu trong kỳ.

## 1. Thống kê có so sánh kỳ trước

GET /api/admin/reports?fromDate=2026-10-01&toDate=2026-10-31

Kỳ so sánh là khoảng liền trước có cùng số ngày. Response gồm thông tin hai kỳ, chênh lệch, phần trăm thay đổi và số lượng theo trạng thái.

Ví dụ cấu trúc response:

    {
      "fromDate": "2026-10-01",
      "toDate": "2026-10-31",
      "comparisonFromDate": "2026-08-31",
      "comparisonToDate": "2026-09-30",
      "hasData": true,
      "message": "Báo cáo đã được tổng hợp",
      "metrics": [
        {
          "key": "appointments",
          "label": "Số lịch hẹn",
          "currentPeriod": 6,
          "previousPeriod": 3,
          "difference": 3,
          "percentChange": 100
        }
      ],
      "appointmentStatusCounts": {
        "CONFIRMED": 3
      },
      "repairTicketStatusCounts": {
        "COMPLETED": 2
      },
      "unavailableMetrics": []
    }

Khi kỳ trước bằng 0, percentChange là null vì không thể tính phần trăm thay đổi.

## 2. Thống kê riêng kỳ đã chọn

GET /api/admin/reports/period?fromDate=2026-10-01&toDate=2026-10-31

API này chỉ trả số liệu trong khoảng đã chọn, không có kỳ so sánh. Mỗi phần tử trong metrics có key, label và value.

Response gồm fromDate, toDate, hasData, message, metrics, appointmentStatusCounts, repairTicketStatusCounts và unavailableMetrics.

## 3. Xuất Excel có so sánh

GET /api/admin/reports/export/excel?fromDate=2026-10-01&toDate=2026-10-31

Response là file XLSX gồm trang tổng quan so sánh hai kỳ và breakdown trạng thái. Trong Postman dùng Send and Download để lưu file.

## 4. Xuất Excel riêng kỳ đã chọn

GET /api/admin/reports/period/export/excel?fromDate=2026-10-01&toDate=2026-10-31

Response là file XLSX chỉ có số liệu của khoảng ngày đã chọn, không có cột hoặc dữ liệu kỳ trước.

## Gọi bằng Postman

1. Tạo request GET cho một trong các endpoint trên.
2. Nhập fromDate và toDate trong tab Params.
3. Chọn Authorization → Bearer Token và nhập token Admin.
4. Với hai endpoint Excel, chọn Send and Download để tải file XLSX.

Các request báo cáo đều chỉ đọc dữ liệu, không tạo hoặc cập nhật lịch hẹn, phiếu sửa chữa hay thanh toán.
