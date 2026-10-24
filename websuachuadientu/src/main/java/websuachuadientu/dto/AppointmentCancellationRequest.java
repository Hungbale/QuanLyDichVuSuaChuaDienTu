package websuachuadientu.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record AppointmentCancellationRequest(
        @NotBlank
        @Pattern(regexp = "APPROVE|REJECT")
        String decision
) {}
