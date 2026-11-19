package websuachuadientu.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public record AppointmentAvailabilityResponse(
        LocalDate date,
        LocalTime time,
        boolean available,
        int remainingCapacity
) {}
