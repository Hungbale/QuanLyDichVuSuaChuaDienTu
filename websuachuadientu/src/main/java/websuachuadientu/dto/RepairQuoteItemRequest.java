package websuachuadientu.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record RepairQuoteItemRequest(
        @NotBlank @Size(max = 250) String name,
        @NotNull @Positive Integer quantity,
        @NotNull @DecimalMin("0.00") BigDecimal unitPrice
) {}
