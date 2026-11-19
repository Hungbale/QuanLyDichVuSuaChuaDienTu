package websuachuadientu.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public record AppointmentCancellationResponse(
        Long appointmentId,
        Long customerId,
        String customerName,
        String device,
        LocalDate appointmentDate,
        LocalTime appointmentTime,
        Long repairTicketId,
        String cancellationReason,
        String status
) {}
