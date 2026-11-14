package websuachuadientu.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import websuachuadientu.dto.SystemReportResponse;
import websuachuadientu.dto.SystemReportPeriodResponse;
import websuachuadientu.service.SystemReportService;

@RestController
@RequestMapping("/api/admin/reports")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "System Reports", description = "Admin xem và xuất báo cáo thống kê hoạt động hệ thống")
@RequiredArgsConstructor
public class SystemReportController {
    private final SystemReportService reportService;

    @Operation(summary = "Xem báo cáo thống kê hoạt động hệ thống theo khoảng ngày",
            description = "Bắt buộc fromDate và toDate theo yyyy-MM-dd; fromDate không sau toDate; "
                    + "toDate không vượt quá ngày hiện tại; khoảng báo cáo tối đa 366 ngày. "
                    + "Kỳ trước là khoảng liền trước có cùng số ngày. Lịch hẹn được tính theo appointmentDate, "
                    + "phiếu tiếp nhận theo receivedDate, phiếu hoàn thành theo completedDate và doanh thu theo paidAt "
                    + "của giao dịch PAID. Breakdown trạng thái dùng trạng thái hiện tại. Chỉ quản trị viên được gọi.")
    @GetMapping
    public ResponseEntity<SystemReportResponse> getReport(
            @Parameter(description = "Ngày bắt đầu, bao gồm cả ngày đó. Định dạng yyyy-MM-dd.")
            @RequestParam(required = false) String fromDate,
            @Parameter(description = "Ngày kết thúc, bao gồm cả ngày đó; không được là ngày tương lai. Định dạng yyyy-MM-dd.")
            @RequestParam(required = false) String toDate) {
        return ResponseEntity.ok(reportService.getReport(fromDate, toDate));
    }

    @Operation(summary = "Xem thống kê của riêng khoảng thời gian đã chọn, không so sánh kỳ trước",
            description = "Dùng cùng ràng buộc ngày và phân quyền admin như API báo cáo tổng hợp.")
    @GetMapping("/period")
    public ResponseEntity<SystemReportPeriodResponse> getPeriodReport(
            @Parameter(description = "Ngày bắt đầu theo yyyy-MM-dd, tính cả ngày.")
            @RequestParam(required = false) String fromDate,
            @Parameter(description = "Ngày kết thúc theo yyyy-MM-dd, tính cả ngày, không vượt quá ngày hiện tại.")
            @RequestParam(required = false) String toDate) {
        return ResponseEntity.ok(reportService.getPeriodReport(fromDate, toDate));
    }

    @Operation(summary = "Xuất Excel thống kê của riêng khoảng thời gian đã chọn, không so sánh kỳ trước")
    @GetMapping(value = "/period/export/excel",
            produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> exportPeriodExcelReport(
            @Parameter(description = "Ngày bắt đầu theo yyyy-MM-dd.")
            @RequestParam(required = false) String fromDate,
            @Parameter(description = "Ngày kết thúc theo yyyy-MM-dd, không vượt quá ngày hiện tại.")
            @RequestParam(required = false) String toDate) {
        byte[] content = reportService.exportPeriodExcel(fromDate, toDate);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=system-report-period.xlsx")
                .body(content);
    }

    @Operation(summary = "Xuất báo cáo thống kê thành file Excel XLSX",
            description = "Áp dụng cùng khoảng ngày và phân quyền admin như API xem báo cáo.")
    @GetMapping(value = "/export/excel",
            produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> exportExcelReport(
            @Parameter(description = "Ngày bắt đầu theo yyyy-MM-dd.")
            @RequestParam(required = false) String fromDate,
            @Parameter(description = "Ngày kết thúc theo yyyy-MM-dd, không vượt quá ngày hiện tại.")
            @RequestParam(required = false) String toDate) {
        byte[] content = reportService.exportExcel(fromDate, toDate);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=system-report.xlsx")
                .body(content);
    }
}
