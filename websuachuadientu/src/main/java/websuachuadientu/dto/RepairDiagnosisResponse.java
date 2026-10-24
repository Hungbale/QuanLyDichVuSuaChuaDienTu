package websuachuadientu.dto;

import java.time.LocalDateTime;

public record RepairDiagnosisResponse(
        Long id,
        Long ticketId,
        String ticketCode,
        String device,
        String customerName,
        String customerReportedIssue,
        String diagnosisResult,
        String repairProposal,
        String technicalNote,
        String diagnosedBy,
        LocalDateTime diagnosedAt,
        String ticketStatus
) {}
