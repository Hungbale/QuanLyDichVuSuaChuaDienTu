package websuachuadientu.dto;

import java.time.LocalDateTime;

public record RepairIntakeResponse(
        Long id,
        Long ticketId,
        String ticketCode,
        String customerName,
        String device,
        String serialNumber,
        String appearanceCondition,
        String includedAccessories,
        String customerReportedIssue,
        String intakeNote,
        String receivedBy,
        LocalDateTime receivedAt
) {}
