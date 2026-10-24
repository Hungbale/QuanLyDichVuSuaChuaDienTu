package websuachuadientu.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RepairIntakeRequest(
        @Size(max = 100) String serialNumber,
        @NotBlank @Size(max = 2000) String appearanceCondition,
        @Size(max = 2000) String includedAccessories,
        @Size(max = 5000) String customerReportedIssue,
        @Size(max = 2000) String intakeNote
) {}
