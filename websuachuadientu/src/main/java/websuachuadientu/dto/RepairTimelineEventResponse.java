package websuachuadientu.dto;

import java.time.LocalDateTime;

public record RepairTimelineEventResponse(
        String type,
        String title,
        String details,
        String note,
        LocalDateTime createdAt,
        String actorName
) {}
