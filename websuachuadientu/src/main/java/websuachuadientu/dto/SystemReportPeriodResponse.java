package websuachuadientu.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record SystemReportPeriodResponse(
        LocalDate fromDate,
        LocalDate toDate,
        boolean hasData,
        String message,
        List<SystemReportValueResponse> metrics,
        Map<String, Long> appointmentStatusCounts,
        Map<String, Long> repairTicketStatusCounts,
        List<String> unavailableMetrics
) {
}
