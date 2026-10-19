package websuachuadientu.dto;

import java.time.LocalDateTime;
import java.util.List;

public record RepairStatusUpdateResponse(
        Long id,
        String status,
        String note,
        LocalDateTime createdAt,
        String employeeName,
        List<RepairStatusPhotoResponse> photos
) {}
