package websuachuadientu.dto;

import java.time.LocalDateTime;

public record RepairTicketActivityResponse(
        Long id,
        String action,
        String details,
        String note,
        String employeeName,
        LocalDateTime createdAt
) {}
