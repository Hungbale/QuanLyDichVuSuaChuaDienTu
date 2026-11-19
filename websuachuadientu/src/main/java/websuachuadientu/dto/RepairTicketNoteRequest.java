package websuachuadientu.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RepairTicketNoteRequest(
        @NotBlank @Size(max = 2000) String note
) {}
