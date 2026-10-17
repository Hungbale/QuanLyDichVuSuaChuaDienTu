package websuachuadientu.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record RepairQuoteResponse(
        Long id,
        String quoteCode,
        Long repairTicketId,
        String ticketCode,
        String customerName,
        List<Item> items,
        BigDecimal totalAmount,
        String status,
        LocalDateTime createdAt
) {
    public record Item(Long id, String name, Integer quantity, BigDecimal unitPrice, BigDecimal lineTotal) {}
}
