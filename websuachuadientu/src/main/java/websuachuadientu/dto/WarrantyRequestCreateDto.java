package websuachuadientu.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record WarrantyRequestCreateDto(
        @NotBlank(message = "Mã phiếu sửa chữa không được để trống")
        @Size(max = 20, message = "Mã phiếu sửa chữa không hợp lệ")
        String ticketCode,

        @NotBlank(message = "Nội dung lỗi cần bảo hành không được để trống")
        @Size(max = 2000, message = "Nội dung lỗi tối đa 2000 ký tự")
        String reason,

        @Size(max = 2000, message = "Mô tả chi tiết tối đa 2000 ký tự")
        String description
) {
}
