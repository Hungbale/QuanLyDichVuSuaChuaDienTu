package websuachuadientu.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class RepairTicketRequest {
    @NotNull
    private Long customerId;

    @NotBlank
    @Size(max = 200)
    private String device;

    @NotNull
    private LocalDate receivedDate;

    @NotBlank
    @Size(max = 50)
    private String status;

    private Long technicianId;
}
