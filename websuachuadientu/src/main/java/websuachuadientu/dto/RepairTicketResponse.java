package websuachuadientu.dto;

import java.time.LocalDate;

public record RepairTicketResponse(
        Long id,
        String ticketCode,
        Long customerId,
        String customerName,
        String device,
        LocalDate receivedDate,
        String status,
        Long technicianId,
        String technicianName
) {}
