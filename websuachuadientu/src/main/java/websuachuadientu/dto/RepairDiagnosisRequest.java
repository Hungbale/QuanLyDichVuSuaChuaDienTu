package websuachuadientu.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RepairDiagnosisRequest(
        @NotBlank @Size(max = 5000) String diagnosisResult,
        @NotBlank @Size(max = 5000) String repairProposal,
        @Size(max = 2000) String technicalNote
) {}
