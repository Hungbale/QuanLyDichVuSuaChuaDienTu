package websuachuadientu.dto;

import java.math.BigDecimal;

public record SystemReportMetricResponse(
        String key,
        String label,
        BigDecimal currentPeriod,
        BigDecimal previousPeriod,
        BigDecimal difference,
        BigDecimal percentChange
) {
}
