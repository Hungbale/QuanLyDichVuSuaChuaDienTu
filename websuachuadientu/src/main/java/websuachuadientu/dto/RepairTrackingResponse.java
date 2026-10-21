package websuachuadientu.dto;

import java.util.List;

public record RepairTrackingResponse(
        Long ticketId,
        String ticketCode,
        String serviceName,
        String device,
        String currentStatus,
        List<RepairStatusUpdateResponse> updates
) {}
