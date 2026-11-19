package websuachuadientu.dto;

import java.time.LocalDateTime;

public record WarrantyRequestResponse(
        Long id,
        Long repairTicketId,
        String ticketCode,
        String device,
        String serviceName,
        Long customerId,
        String customerName,
        String reason,
        String description,
        String attachmentFileName,
        String attachmentContentType,
        boolean hasAttachment,
        String status,
        String resolutionNote,
        Long processedByEmployeeId,
        String processedByEmployeeName,
        LocalDateTime createdAt,
        LocalDateTime processedAt
) {
}
