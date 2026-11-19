package websuachuadientu.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RepairFinalInspectionRequest(
        @NotNull(message = "Vui lòng xác nhận thiết bị hoạt động bình thường") Boolean deviceWorksNormally,
        @NotNull(message = "Vui lòng xác nhận các chức năng chính hoạt động") Boolean mainFunctionsWork,
        @NotNull(message = "Vui lòng xác nhận tình trạng lỗi phát sinh") Boolean noNewIssues,
        @Size(max = 5000, message = "Thông tin hoàn thành không được vượt quá 5.000 ký tự") String completionInfo,
        @NotNull(message = "Thiếu lựa chọn lưu thông tin hoặc hoàn thành phiếu") Boolean complete
) {}
