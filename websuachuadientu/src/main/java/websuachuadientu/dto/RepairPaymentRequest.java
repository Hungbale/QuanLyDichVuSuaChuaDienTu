package websuachuadientu.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record RepairPaymentRequest(
        @NotBlank @Pattern(regexp = "BANK_TRANSFER|CASH") String method
) {}
