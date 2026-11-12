package websuachuadientu.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record RepairQuoteDecisionRequest(
        @NotBlank @Pattern(regexp = "ACCEPTED|REJECTED") String decision
) {}
