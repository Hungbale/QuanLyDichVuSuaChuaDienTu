package websuachuadientu.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record WarrantyRequestProcessDto(
        @NotBlank(message = "Trạng thái không được để trống")
        String status, // APPROVED, REJECTED, COMPLETED

        @Size(max = 2000, message = "Ghi chú xử lý tối đa 2000 ký tự")
        String resolutionNote
) {
}
