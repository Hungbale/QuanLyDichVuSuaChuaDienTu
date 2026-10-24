package websuachuadientu.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record RepairQuoteRequest(@NotEmpty @Size(max = 100) List<@Valid RepairQuoteItemRequest> items) {}
