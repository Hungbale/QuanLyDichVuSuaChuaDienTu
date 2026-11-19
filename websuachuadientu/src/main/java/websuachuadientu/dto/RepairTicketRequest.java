package websuachuadientu.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import websuachuadientu.enums.RepairTicketStatus;

@Getter
@Setter
public class RepairTicketRequest {
    private Long customerId;

    @NotBlank
    @Size(max = 200)
    private String device;

    @NotNull
    private LocalDate receivedDate;

    @NotNull
    private RepairTicketStatus status;

    @Size(max = 2000)
    private String note;

    private Long technicianId;

    private Long appointmentId;

    private Long serviceId;
}
