package websuachuadientu.dto;

import java.time.LocalDateTime;

public record RepairFinalInspectionResponse(
        Long id,
        Long ticketId,
        String ticketCode,
        Boolean deviceWorksNormally,
        Boolean mainFunctionsWork,
        Boolean noNewIssues,
        String completionInfo,
        String inspectedBy,
        LocalDateTime inspectedAt,
        LocalDateTime completedAt,
        String ticketStatus
) {}
