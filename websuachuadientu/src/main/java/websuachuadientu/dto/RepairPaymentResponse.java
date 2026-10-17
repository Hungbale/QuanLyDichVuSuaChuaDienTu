package websuachuadientu.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record RepairPaymentResponse(
        Long id,
        String ticketCode,
        BigDecimal amount,
        String status,
        String method,
        LocalDate dueDate,
        LocalDateTime createdAt,
        LocalDateTime paidAt
) {}
