package websuachuadientu.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record RepairHistoryResponse(
        String ticketCode,
        String device,
        String service,
        LocalDate completedDate,
        BigDecimal cost,
        String status
) {}
