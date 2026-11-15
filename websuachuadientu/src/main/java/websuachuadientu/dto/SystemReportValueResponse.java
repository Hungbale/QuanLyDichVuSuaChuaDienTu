package websuachuadientu.dto;

import java.math.BigDecimal;

public record SystemReportValueResponse(
        String key,
        String label,
        BigDecimal value
) {
}
