package websuachuadientu.dto;

import java.time.LocalDateTime;

public record ServiceReviewResponse(
        Long id,
        Long repairTicketId,
        String ticketCode,
        String serviceName,
        Long customerId,
        String customerName,
        Integer rating,
        String comment,
        LocalDateTime createdAt
) {
}
