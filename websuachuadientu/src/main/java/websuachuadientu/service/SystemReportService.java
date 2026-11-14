package websuachuadientu.service;

import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import websuachuadientu.dto.SystemReportMetricResponse;
import websuachuadientu.dto.SystemReportPeriodResponse;
import websuachuadientu.dto.SystemReportResponse;
import websuachuadientu.dto.SystemReportValueResponse;
import websuachuadientu.enums.RepairTicketStatus;
import websuachuadientu.repository.AppointmentRepository;
import websuachuadientu.repository.RepairPaymentRepository;
import websuachuadientu.repository.RepairTicketRepository;
import websuachuadientu.repository.ReportStatusCount;
import websuachuadientu.repository.ServiceReviewRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
public class SystemReportService {
    private static final long MAX_PERIOD_DAYS = 366;
    private static final DateTimeFormatter ISO_DATE = DateTimeFormatter.ISO_LOCAL_DATE;

    private final AppointmentRepository appointmentRepository;
    private final RepairTicketRepository ticketRepository;
    private final RepairPaymentRepository paymentRepository;
    private final ServiceReviewRepository reviewRepository;

    public SystemReportResponse getReport(String fromDateValue, String toDateValue) {
        LocalDate fromDate = parseRequiredDate(fromDateValue, "fromDate");
        LocalDate toDate = parseRequiredDate(toDateValue, "toDate");
        validatePeriod(fromDate, toDate);

        long periodLength = ChronoUnit.DAYS.between(fromDate, toDate) + 1;
        LocalDate comparisonTo;
        LocalDate comparisonFrom;
        try {
            comparisonTo = fromDate.minusDays(1);
            comparisonFrom = comparisonTo.minusDays(periodLength - 1);
        } catch (DateTimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "fromDate quá sớm để tạo kỳ so sánh liền trước", exception);
        }

        PeriodMetrics current = loadMetrics(fromDate, toDate);
        PeriodMetrics previous = loadMetrics(comparisonFrom, comparisonTo);
        List<SystemReportMetricResponse> metrics = new ArrayList<>();
        metrics.add(metric("appointments", "Số lịch hẹn", current.appointments(), previous.appointments()));
        metrics.add(metric("repairTickets", "Số phiếu sửa chữa", current.ticketsReceived(), previous.ticketsReceived()));
        metrics.add(metric("completedTickets", "Phiếu hoàn thành", current.completedTickets(), previous.completedTickets()));
        metrics.add(metric("revenue", "Doanh thu", current.revenue(), previous.revenue()));
        metrics.add(metric("averageRating", "Đánh giá trung bình (trên 5)",
                current.averageRating(), previous.averageRating()));

        boolean hasData = current.appointments() > 0 || current.ticketsReceived() > 0
                || current.completedTickets() > 0 || current.revenue().compareTo(BigDecimal.ZERO) > 0
                || current.averageRating() != null;
        List<String> unavailableMetrics = new ArrayList<>();
        if (current.averageRating() == null) {
            unavailableMetrics.add("averageRating: kỳ hiện tại chưa có đánh giá dịch vụ");
        }
        if (previous.averageRating() == null) {
            unavailableMetrics.add("averageRatingComparison: kỳ so sánh chưa có đánh giá dịch vụ");
        }
        return new SystemReportResponse(fromDate, toDate, comparisonFrom, comparisonTo, hasData,
                hasData ? "Báo cáo đã được tổng hợp" : "Không có dữ liệu phù hợp trong khoảng thời gian đã chọn",
                metrics, current.appointmentStatuses(), current.ticketStatuses(),
                unavailableMetrics);
    }

    public SystemReportPeriodResponse getPeriodReport(String fromDateValue, String toDateValue) {
        LocalDate fromDate = parseRequiredDate(fromDateValue, "fromDate");
        LocalDate toDate = parseRequiredDate(toDateValue, "toDate");
        validatePeriod(fromDate, toDate);
        PeriodMetrics period = loadMetrics(fromDate, toDate);

        List<SystemReportValueResponse> metrics = List.of(
                value("appointments", "Số lịch hẹn", BigDecimal.valueOf(period.appointments())),
                value("repairTickets", "Số phiếu sửa chữa", BigDecimal.valueOf(period.ticketsReceived())),
                value("completedTickets", "Phiếu hoàn thành", BigDecimal.valueOf(period.completedTickets())),
                value("revenue", "Doanh thu", period.revenue()),
                value("averageRating", "Đánh giá trung bình (trên 5)", period.averageRating()));
        boolean hasData = period.appointments() > 0 || period.ticketsReceived() > 0
                || period.completedTickets() > 0 || period.revenue().compareTo(BigDecimal.ZERO) > 0
                || period.averageRating() != null;
        List<String> unavailableMetrics = period.averageRating() == null
                ? List.of("averageRating: kỳ đã chọn chưa có đánh giá dịch vụ")
                : List.of();
        return new SystemReportPeriodResponse(fromDate, toDate, hasData,
                hasData ? "Thống kê kỳ đã được tổng hợp"
                        : "Không có dữ liệu phù hợp trong khoảng thời gian đã chọn",
                metrics, period.appointmentStatuses(), period.ticketStatuses(),
                unavailableMetrics);
    }

    public byte[] exportExcel(String fromDateValue, String toDateValue) {
        SystemReportResponse report = getReport(fromDateValue, toDateValue);
        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            CellStyle titleStyle = workbook.createCellStyle();
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 16);
            titleStyle.setFont(titleFont);

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            Sheet summary = workbook.createSheet("Tổng quan");
            setText(summary.createRow(0).createCell(0), "BÁO CÁO HOẠT ĐỘNG HỆ THỐNG", titleStyle);
            setText(summary.createRow(1).createCell(0), "Từ ngày", null);
            setText(summary.getRow(1).createCell(1), report.fromDate().format(ISO_DATE), null);
            setText(summary.createRow(2).createCell(0), "Đến ngày", null);
            setText(summary.getRow(2).createCell(1), report.toDate().format(ISO_DATE), null);
            setText(summary.createRow(3).createCell(0), "Kỳ so sánh", null);
            setText(summary.getRow(3).createCell(1), report.comparisonFromDate().format(ISO_DATE)
                    + " đến " + report.comparisonToDate().format(ISO_DATE), null);
            setText(summary.createRow(4).createCell(0), "Thông báo", null);
            setText(summary.getRow(4).createCell(1), report.message(), null);

            String[] headers = {"Chỉ tiêu", "Kỳ này", "Kỳ trước", "Thay đổi", "Thay đổi (%)"};
            Row header = summary.createRow(6);
            for (int column = 0; column < headers.length; column++) {
                setText(header.createCell(column), headers[column], headerStyle);
            }
            int rowIndex = 7;
            for (SystemReportMetricResponse metric : report.metrics()) {
                Row row = summary.createRow(rowIndex++);
                setText(row.createCell(0), metric.label(), null);
                setNumberOrUnavailable(row.createCell(1), metric.currentPeriod());
                setNumberOrUnavailable(row.createCell(2), metric.previousPeriod());
                setNumberOrUnavailable(row.createCell(3), metric.difference());
                setNumberOrUnavailable(row.createCell(4), metric.percentChange());
            }
            rowIndex++;
            setText(summary.createRow(rowIndex++).createCell(0), "Chỉ tiêu chưa có dữ liệu", headerStyle);
            for (String unavailable : report.unavailableMetrics()) {
                setText(summary.createRow(rowIndex++).createCell(0), unavailable, null);
            }
            summary.createFreezePane(1, 7);
            summary.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(6, 6 + report.metrics().size(), 0, 4));
            for (int column = 0; column < headers.length; column++) {
                summary.autoSizeColumn(column);
            }

            Sheet statuses = workbook.createSheet("Trạng thái");
            Row statusHeader = statuses.createRow(0);
            setText(statusHeader.createCell(0), "Loại", headerStyle);
            setText(statusHeader.createCell(1), "Trạng thái hiện tại", headerStyle);
            setText(statusHeader.createCell(2), "Số lượng", headerStyle);
            int statusRow = 1;
            statusRow = writeStatusRows(statuses, statusRow, "Lịch hẹn", report.appointmentStatusCounts());
            writeStatusRows(statuses, statusRow, "Phiếu sửa chữa", report.repairTicketStatusCounts());
            statuses.createFreezePane(0, 1);
            statuses.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(0,
                    Math.max(1, statuses.getLastRowNum()), 0, 2));
            for (int column = 0; column < 3; column++) {
                statuses.autoSizeColumn(column);
            }

            workbook.write(output);
            return output.toByteArray();
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Không thể tạo file Excel báo cáo", exception);
        }
    }

    public byte[] exportPeriodExcel(String fromDateValue, String toDateValue) {
        SystemReportPeriodResponse report = getPeriodReport(fromDateValue, toDateValue);
        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            CellStyle titleStyle = workbook.createCellStyle();
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 16);
            titleStyle.setFont(titleFont);

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            Sheet summary = workbook.createSheet("Tổng quan kỳ");
            setText(summary.createRow(0).createCell(0), "THỐNG KÊ HOẠT ĐỘNG HỆ THỐNG", titleStyle);
            setText(summary.createRow(1).createCell(0), "Từ ngày", null);
            setText(summary.getRow(1).createCell(1), report.fromDate().format(ISO_DATE), null);
            setText(summary.createRow(2).createCell(0), "Đến ngày", null);
            setText(summary.getRow(2).createCell(1), report.toDate().format(ISO_DATE), null);
            setText(summary.createRow(3).createCell(0), "Thông báo", null);
            setText(summary.getRow(3).createCell(1), report.message(), null);

            String[] headers = {"Chỉ tiêu", "Giá trị"};
            Row header = summary.createRow(5);
            for (int column = 0; column < headers.length; column++) {
                setText(header.createCell(column), headers[column], headerStyle);
            }
            int rowIndex = 6;
            for (SystemReportValueResponse metric : report.metrics()) {
                Row row = summary.createRow(rowIndex++);
                setText(row.createCell(0), metric.label(), null);
                setNumberOrUnavailable(row.createCell(1), metric.value());
            }
            rowIndex++;
            setText(summary.createRow(rowIndex++).createCell(0), "Chỉ tiêu chưa có dữ liệu", headerStyle);
            for (String unavailable : report.unavailableMetrics()) {
                setText(summary.createRow(rowIndex++).createCell(0), unavailable, null);
            }
            summary.createFreezePane(0, 6);
            summary.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(
                    5, 5 + report.metrics().size(), 0, 1));
            summary.autoSizeColumn(0);
            summary.autoSizeColumn(1);

            Sheet statuses = workbook.createSheet("Trạng thái");
            Row statusHeader = statuses.createRow(0);
            setText(statusHeader.createCell(0), "Loại", headerStyle);
            setText(statusHeader.createCell(1), "Trạng thái hiện tại", headerStyle);
            setText(statusHeader.createCell(2), "Số lượng", headerStyle);
            int statusRow = 1;
            statusRow = writeStatusRows(statuses, statusRow, "Lịch hẹn", report.appointmentStatusCounts());
            writeStatusRows(statuses, statusRow, "Phiếu sửa chữa", report.repairTicketStatusCounts());
            statuses.createFreezePane(0, 1);
            statuses.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(0,
                    Math.max(1, statuses.getLastRowNum()), 0, 2));
            for (int column = 0; column < 3; column++) {
                statuses.autoSizeColumn(column);
            }

            workbook.write(output);
            return output.toByteArray();
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Không thể tạo file Excel thống kê", exception);
        }
    }

    private int writeStatusRows(Sheet sheet, int startRow, String category, Map<String, Long> counts) {
        if (counts.isEmpty()) {
            Row row = sheet.createRow(startRow++);
            setText(row.createCell(0), category, null);
            setText(row.createCell(1), "Không có dữ liệu", null);
            row.createCell(2).setCellValue(0);
            return startRow;
        }
        for (Map.Entry<String, Long> entry : counts.entrySet()) {
            Row row = sheet.createRow(startRow++);
            setText(row.createCell(0), category, null);
            setText(row.createCell(1), entry.getKey(), null);
            row.createCell(2).setCellValue(entry.getValue());
        }
        return startRow;
    }

    private void setText(Cell cell, String value, CellStyle style) {
        cell.setCellValue(value == null ? "" : value);
        if (style != null) {
            cell.setCellStyle(style);
        }
    }

    private void setNumberOrUnavailable(Cell cell, BigDecimal value) {
        if (value == null) {
            cell.setCellValue("Chưa có dữ liệu");
        } else {
            cell.setCellValue(value.doubleValue());
        }
    }

    private PeriodMetrics loadMetrics(LocalDate fromDate, LocalDate toDate) {
        long appointments = appointmentRepository.countByAppointmentDateBetween(fromDate, toDate);
        long ticketsReceived = ticketRepository.countByReceivedDateBetween(fromDate, toDate);
        long completedTickets = ticketRepository.countCompletedBetween(fromDate, toDate, "COMPLETED");
        BigDecimal revenue = paymentRepository.sumPaidAmountBetween(
                fromDate.atStartOfDay(), toDate.plusDays(1).atStartOfDay());
        Double averageRatingValue = reviewRepository.averageRatingBetween(
                fromDate.atStartOfDay(), toDate.plusDays(1).atStartOfDay());
        BigDecimal averageRating = averageRatingValue == null ? null
                : BigDecimal.valueOf(averageRatingValue).setScale(2, RoundingMode.HALF_UP);
        return new PeriodMetrics(appointments, ticketsReceived, completedTickets,
                revenue == null ? BigDecimal.ZERO : revenue, averageRating,
                countByStatus(appointmentRepository.countStatusesBetween(fromDate, toDate)),
                countRepairTicketStatuses(ticketRepository.countStatusesReceivedBetween(fromDate, toDate)));
    }

    private Map<String, Long> countByStatus(List<ReportStatusCount> counts) {
        Map<String, Long> result = new TreeMap<>();
        for (ReportStatusCount count : counts) {
            result.merge(count.getStatus(), count.getTotal(), Long::sum);
        }
        return result;
    }

    private Map<String, Long> countRepairTicketStatuses(List<ReportStatusCount> counts) {
        Map<String, Long> result = new TreeMap<>();
        for (ReportStatusCount count : counts) {
            String status = count.getStatus();
            try {
                status = RepairTicketStatus.fromValue(status).name();
            } catch (IllegalArgumentException ignored) {
                status = status.trim().toUpperCase(Locale.ROOT);
            }
            result.merge(status, count.getTotal(), Long::sum);
        }
        return result;
    }

    private SystemReportMetricResponse metric(String key, String label, Long current, Long previous) {
        return metric(key, label,
                current == null ? null : BigDecimal.valueOf(current),
                previous == null ? null : BigDecimal.valueOf(previous));
    }

    private SystemReportValueResponse value(String key, String label, BigDecimal value) {
        return new SystemReportValueResponse(key, label, value);
    }

    private SystemReportMetricResponse metric(String key, String label, BigDecimal current, BigDecimal previous) {
        if (current == null || previous == null) {
            return new SystemReportMetricResponse(key, label, current, previous, null, null);
        }
        BigDecimal difference = current.subtract(previous);
        BigDecimal percentChange = previous.compareTo(BigDecimal.ZERO) == 0
                ? null
                : difference.multiply(BigDecimal.valueOf(100))
                .divide(previous, 2, RoundingMode.HALF_UP);
        return new SystemReportMetricResponse(key, label, current, previous, difference, percentChange);
    }

    private LocalDate parseRequiredDate(String value, String parameterName) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Tham số " + parameterName + " là bắt buộc và phải theo định dạng yyyy-MM-dd");
        }
        try {
            return LocalDate.parse(value, ISO_DATE);
        } catch (DateTimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Tham số " + parameterName + " không hợp lệ; định dạng yêu cầu là yyyy-MM-dd", exception);
        }
    }

    private void validatePeriod(LocalDate fromDate, LocalDate toDate) {
        if (fromDate.isAfter(toDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "fromDate phải nhỏ hơn hoặc bằng toDate");
        }
        if (toDate.isAfter(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "toDate không được lớn hơn ngày hiện tại");
        }
        long periodLength = ChronoUnit.DAYS.between(fromDate, toDate) + 1;
        if (periodLength > MAX_PERIOD_DAYS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Khoảng thời gian báo cáo không được vượt quá 366 ngày");
        }
    }

    private record PeriodMetrics(long appointments, long ticketsReceived, long completedTickets,
                                 BigDecimal revenue, BigDecimal averageRating,
                                 Map<String, Long> appointmentStatuses,
                                 Map<String, Long> ticketStatuses) {
    }
}
