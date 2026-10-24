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
import websuachuadientu.repository.RepairDiagnosisRepository;
import websuachuadientu.enums.RepairQuoteDecision;
import websuachuadientu.enums.RepairTicketStatus;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RepairQuoteService {
    private final RepairQuoteRepository quoteRepository;
    private final RepairTicketRepository ticketRepository;
    private final RepairDiagnosisRepository diagnosisRepository;

    @Transactional
    public RepairQuoteResponse create(Long ticketId, RepairQuoteRequest request, String email, boolean admin) {
        RepairTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phiếu sửa chữa"));
        ensureAssignedEmployee(ticket, email, admin);
        if (diagnosisRepository.findByRepairTicket_Id(ticketId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Record the repair diagnosis before creating a quote");
        }
        if (quoteRepository.existsByRepairTicket_Id(ticketId)) {
            throw new IllegalStateException("Phiếu sửa chữa đã có báo giá");
        }
        transitionTicket(ticket, RepairTicketStatus.WAITING_FOR_QUOTE_APPROVAL);

        RepairQuote quote = new RepairQuote();
        quote.setRepairTicket(ticket);
        quote.setStatus("SENT");
        replaceItemsAndTotal(quote, request.items());
        quote = quoteRepository.save(quote);
        quote.setQuoteCode("BG%06d".formatted(quote.getId()));
        ticketRepository.save(ticket);
        return toResponse(quoteRepository.save(quote));
    }

    @Transactional(readOnly = true)
    public RepairQuoteResponse getByTicketId(Long ticketId, String email, boolean admin) {
        RepairQuote quote = quoteRepository.findByRepairTicket_Id(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Phiếu sửa chữa chưa có báo giá"));
        ensureAssignedEmployee(quote.getRepairTicket(), email, admin);
        return toResponse(quote);
    }

    @Transactional(readOnly = true)
    public RepairQuoteResponse getByTicketIdForCustomer(Long ticketId, String email) {
        RepairQuote quote = quoteRepository.findByRepairTicket_Id(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Phiếu sửa chữa chưa có báo giá"));
        ensureCustomerOwns(quote.getRepairTicket(), email);
        return toResponse(quote);
    }

    @Transactional
    public RepairQuoteResponse decide(Long quoteId, RepairQuoteDecision decision, String email, boolean admin) {
        RepairQuote quote = findQuote(quoteId);
        ensureAssignedEmployee(quote.getRepairTicket(), email, admin);
        if (!"SENT".equals(quote.getStatus())) {
            throw new IllegalStateException("Báo giá không còn ở trạng thái chờ xác nhận");
        }
        quote.setStatus(decision.name());
        transitionTicket(quote.getRepairTicket(), decision == RepairQuoteDecision.ACCEPTED
                ? RepairTicketStatus.REPAIRING : RepairTicketStatus.CUSTOMER_DECLINED);
        return toResponse(quoteRepository.save(quote));
    }

    @Transactional
    public RepairQuoteResponse decideForCustomer(Long quoteId, RepairQuoteDecision decision, String email) {
        RepairQuote quote = findQuote(quoteId);
        ensureCustomerOwns(quote.getRepairTicket(), email);
        if (!"SENT".equals(quote.getStatus())) {
            throw new IllegalStateException("Báo giá không còn ở trạng thái chờ xác nhận");
        }
        quote.setStatus(decision.name());
        transitionTicket(quote.getRepairTicket(), decision == RepairQuoteDecision.ACCEPTED
                ? RepairTicketStatus.REPAIRING : RepairTicketStatus.CUSTOMER_DECLINED);
        return toResponse(quoteRepository.save(quote));
    }

    private void ensureCustomerOwns(RepairTicket ticket, String email) {
        if (ticket.getCustomer() == null || ticket.getCustomer().getUser() == null
                || !ticket.getCustomer().getUser().getEmail().equalsIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền truy cập dữ liệu này");
        }
    }

    private void transitionTicket(RepairTicket ticket, RepairTicketStatus nextStatus) {
        RepairTicketStatus currentStatus;
        try {
            currentStatus = RepairTicketStatus.fromValue(ticket.getStatus());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Current ticket status must be reviewed before it can be changed", exception);
        }
        if (currentStatus == null || !currentStatus.canTransitionTo(nextStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Repair ticket status transition is not allowed");
        }
        ticket.setStatus(nextStatus.storedValue());
    }

    private void ensureAssignedEmployee(RepairTicket ticket, String email, boolean admin) {
        if (!admin && (ticket.getTechnician() == null || ticket.getTechnician().getUser() == null
                || !ticket.getTechnician().getUser().getEmail().equalsIgnoreCase(email))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "This repair ticket is assigned to another employee");
        }
    }

    private RepairQuote findQuote(Long id) {
        return quoteRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy báo giá"));
    }

    private void replaceItemsAndTotal(RepairQuote quote, List<RepairQuoteItemRequest> requests) {
        BigDecimal total = BigDecimal.ZERO;
        BigDecimal maximumAmount = new BigDecimal("999999999999.99");
        for (RepairQuoteItemRequest request : requests) {
            BigDecimal lineTotal = request.unitPrice().multiply(BigDecimal.valueOf(request.quantity()));
            if (lineTotal.compareTo(maximumAmount) > 0
                    || total.add(lineTotal).compareTo(maximumAmount) > 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Quote item and total amounts must fit within the supported 14-digit currency range");
            }
            RepairQuoteItem item = new RepairQuoteItem();
            item.setQuote(quote);
            item.setName(request.name().trim());
            item.setQuantity(request.quantity());
            item.setUnitPrice(request.unitPrice());
            item.setLineTotal(lineTotal);
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
