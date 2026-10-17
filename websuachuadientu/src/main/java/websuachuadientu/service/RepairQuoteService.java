package websuachuadientu.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import websuachuadientu.dto.RepairQuoteItemRequest;
import websuachuadientu.dto.RepairQuoteRequest;
import websuachuadientu.dto.RepairQuoteResponse;
import websuachuadientu.entity.RepairQuote;
import websuachuadientu.entity.RepairQuoteItem;
import websuachuadientu.entity.RepairTicket;
import websuachuadientu.repository.RepairQuoteRepository;
import websuachuadientu.repository.RepairTicketRepository;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RepairQuoteService {
    private final RepairQuoteRepository quoteRepository;
    private final RepairTicketRepository ticketRepository;

    @Transactional
    public RepairQuoteResponse create(Long ticketId, RepairQuoteRequest request) {
        RepairTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phiếu sửa chữa"));
        if (quoteRepository.existsByRepairTicket_Id(ticketId)) {
            throw new IllegalStateException("Phiếu sửa chữa đã có báo giá");
        }

        RepairQuote quote = new RepairQuote();
        quote.setRepairTicket(ticket);
        quote.setStatus("SENT");
        replaceItemsAndTotal(quote, request.items());
        quote = quoteRepository.save(quote);
        quote.setQuoteCode("BG%06d".formatted(quote.getId()));
        ticket.setStatus("Chờ xác nhận báo giá");
        ticketRepository.save(ticket);
        return toResponse(quoteRepository.save(quote));
    }

    @Transactional(readOnly = true)
    public RepairQuoteResponse getByTicketId(Long ticketId) {
        RepairQuote quote = quoteRepository.findByRepairTicket_Id(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Phiếu sửa chữa chưa có báo giá"));
        return toResponse(quote);
    }

    @Transactional(readOnly = true)
    public RepairQuoteResponse getByTicketIdForCustomer(Long ticketId, String email) {
        RepairQuote quote = quoteRepository.findByRepairTicket_Id(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Phiếu sửa chữa chưa có báo giá"));
        ensureCustomerOwns(quote.getRepairTicket(), email);
        return toResponse(quote);
    }

    @Transactional
    public RepairQuoteResponse decide(Long quoteId, String decision) {
        RepairQuote quote = findQuote(quoteId);
        if (!"SENT".equals(quote.getStatus())) {
            throw new IllegalStateException("Báo giá không còn ở trạng thái chờ xác nhận");
        }
        quote.setStatus(decision);
        quote.getRepairTicket().setStatus("ACCEPTED".equals(decision) ? "Đang sửa" : "Khách từ chối");
        return toResponse(quoteRepository.save(quote));
    }

    @Transactional
    public RepairQuoteResponse decideForCustomer(Long quoteId, String decision, String email) {
        RepairQuote quote = findQuote(quoteId);
        ensureCustomerOwns(quote.getRepairTicket(), email);
        if (!"SENT".equals(quote.getStatus())) {
            throw new IllegalStateException("Báo giá không còn ở trạng thái chờ xác nhận");
        }
        quote.setStatus(decision);
        quote.getRepairTicket().setStatus("ACCEPTED".equals(decision) ? "Đang sửa" : "Khách từ chối");
        return toResponse(quoteRepository.save(quote));
    }

    private void ensureCustomerOwns(RepairTicket ticket, String email) {
        if (ticket.getCustomer() == null || ticket.getCustomer().getUser() == null
                || !ticket.getCustomer().getUser().getEmail().equalsIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền truy cập dữ liệu này");
        }
    }

    private RepairQuote findQuote(Long id) {
        return quoteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy báo giá"));
    }

    private void replaceItemsAndTotal(RepairQuote quote, List<RepairQuoteItemRequest> requests) {
        BigDecimal total = BigDecimal.ZERO;
        for (RepairQuoteItemRequest request : requests) {
            RepairQuoteItem item = new RepairQuoteItem();
            item.setQuote(quote);
            item.setName(request.name().trim());
            item.setQuantity(request.quantity());
            item.setUnitPrice(request.unitPrice());
            item.setLineTotal(request.unitPrice().multiply(BigDecimal.valueOf(request.quantity())));
            quote.getItems().add(item);
            total = total.add(item.getLineTotal());
        }
        quote.setTotalAmount(total);
    }

    private RepairQuoteResponse toResponse(RepairQuote quote) {
        return new RepairQuoteResponse(
                quote.getId(), quote.getQuoteCode(), quote.getRepairTicket().getId(),
                quote.getRepairTicket().getTicketCode(), quote.getRepairTicket().getCustomer().getFullName(),
                quote.getItems().stream().map(item -> new RepairQuoteResponse.Item(
                        item.getId(), item.getName(), item.getQuantity(), item.getUnitPrice(), item.getLineTotal()
                )).toList(),
                quote.getTotalAmount(), quote.getStatus(), quote.getCreatedAt()
        );
    }
}
