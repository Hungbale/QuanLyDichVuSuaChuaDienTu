package websuachuadientu.dto;

import jakarta.validation.constraints.NotNull;
import websuachuadientu.enums.RepairQuoteDecision;

public record RepairQuoteDecisionRequest(
        @NotNull RepairQuoteDecision decision
) {}
