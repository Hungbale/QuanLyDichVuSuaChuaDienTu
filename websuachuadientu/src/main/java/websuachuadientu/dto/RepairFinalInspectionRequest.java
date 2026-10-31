package websuachuadientu.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RepairFinalInspectionRequest(
        @NotNull Boolean deviceWorksNormally,
        @NotNull Boolean mainFunctionsWork,
        @NotNull Boolean noNewIssues,
        @Size(max = 5000) String completionInfo,
        @NotNull Boolean complete
) {}
