package websuachuadientu.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record RepairHistoryResponse(
        Long ticketId,
        String ticketCode,
        String bookedService,
        String device,
        String service,
        LocalDate completedDate,
        BigDecimal cost,
        String status,
        String trackingUrl
) {}
