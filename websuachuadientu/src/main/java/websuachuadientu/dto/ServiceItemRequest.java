package websuachuadientu.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class ServiceItemRequest {

    @NotBlank(message = "Tên dịch vụ không được để trống")
    private String name;

    @NotNull(message = "Danh mục không được để trống")
    private Long categoryId;

    @NotNull(message = "Giá tham khảo không được để trống")
    @DecimalMin(value = "0", inclusive = true, message = "Giá tham khảo phải lớn hơn hoặc bằng 0")
    private BigDecimal price;

    private String description;
}
