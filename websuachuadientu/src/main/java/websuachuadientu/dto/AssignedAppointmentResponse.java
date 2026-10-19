package websuachuadientu.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public record AssignedAppointmentResponse(
        Long id,
        Long customerId,
        String customerName,
        String device,
        Long serviceId,
        String serviceName,
        LocalDate appointmentDate,
        LocalTime appointmentTime,
        String serviceMethod,
        String contactPhone,
        String problemDescription,
        String pickupAddress,
        String status
) {}
