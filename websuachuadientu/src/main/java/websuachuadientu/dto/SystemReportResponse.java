package websuachuadientu.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record SystemReportResponse(
        LocalDate fromDate,
        LocalDate toDate,
        LocalDate comparisonFromDate,
        LocalDate comparisonToDate,
        boolean hasData,
        String message,
        List<SystemReportMetricResponse> metrics,
        Map<String, Long> appointmentStatusCounts,
        Map<String, Long> repairTicketStatusCounts,
        List<String> unavailableMetrics
) {
}
