package websuachuadientu.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import websuachuadientu.dto.RepairPaymentRequest;
import websuachuadientu.dto.RepairPaymentResponse;
import websuachuadientu.entity.RepairPayment;
import websuachuadientu.entity.RepairQuote;
import websuachuadientu.repository.RepairPaymentRepository;
import websuachuadientu.repository.RepairQuoteRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RepairPaymentService {
    private final RepairPaymentRepository paymentRepository;
    private final RepairQuoteRepository quoteRepository;

    @Transactional
    public RepairPaymentResponse initiate(Long ticketId, RepairPaymentRequest request) {
        RepairQuote quote = quoteRepository.findByRepairTicket_Id(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Phiếu sửa chữa chưa có báo giá"));
        if (!"ACCEPTED".equals(quote.getStatus())) {
            throw new IllegalStateException("Cần chấp nhận báo giá trước khi thanh toán");
        }

        if (paymentRepository.existsByQuote_Id(quote.getId())) {
            throw new IllegalStateException("This quote already has a payment transaction");
        }

        RepairPayment payment = new RepairPayment();
        payment.setQuote(quote);
        payment.setAmount(quote.getTotalAmount());
        payment.setMethod(request.method());
        payment.setStatus("PENDING");
        payment.setDueDate(LocalDate.now().plusDays(30));
        return toResponse(paymentRepository.save(payment));
    }

    @Transactional
    public RepairPaymentResponse initiateForCustomer(Long ticketId, RepairPaymentRequest request, String email) {
        RepairQuote quote = quoteRepository.findByRepairTicket_Id(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Phiếu sửa chữa chưa có báo giá"));
        ensureCustomerOwns(quote, email);
        return initiate(ticketId, request);
    }

    @Transactional(readOnly = true)
    public List<RepairPaymentResponse> history(Long ticketId) {
        if (!quoteRepository.existsByRepairTicket_Id(ticketId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Phiếu sửa chữa chưa có báo giá");
        }
        return paymentRepository.findByQuote_RepairTicket_IdOrderByCreatedAtDesc(ticketId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<RepairPaymentResponse> historyForCustomer(Long ticketId, String email) {
        RepairQuote quote = quoteRepository.findByRepairTicket_Id(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Phiếu sửa chữa chưa có báo giá"));
        ensureCustomerOwns(quote, email);
        return history(ticketId);
    }

    private void ensureCustomerOwns(RepairQuote quote, String email) {
        if (quote.getRepairTicket().getCustomer() == null
                || quote.getRepairTicket().getCustomer().getUser() == null
                || !quote.getRepairTicket().getCustomer().getUser().getEmail().equalsIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền truy cập dữ liệu này");
        }
    }

    @Transactional
    public RepairPaymentResponse confirmReceived(Long paymentId, String email, boolean admin) {
        RepairPayment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy giao dịch thanh toán"));
        ensureAssignedEmployee(payment.getQuote().getRepairTicket(), email, admin);
        if (!"PENDING".equals(payment.getStatus())) {
            throw new IllegalStateException("Giao dịch này không ở trạng thái chờ thanh toán");
        }
        payment.setStatus("PAID");
        payment.setPaidAt(LocalDateTime.now());
        return toResponse(paymentRepository.save(payment));
    }

    private RepairPaymentResponse toResponse(RepairPayment payment) {
        return new RepairPaymentResponse(
                payment.getId(), payment.getQuote().getRepairTicket().getTicketCode(),
                payment.getAmount(), payment.getStatus(), payment.getMethod(),
                payment.getDueDate(), payment.getCreatedAt(), payment.getPaidAt()
        );
    }

    @Transactional(readOnly = true)
    public List<RepairPaymentResponse> historyForEmployee(Long ticketId, String email) {
        RepairQuote quote = quoteRepository.findByRepairTicket_Id(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy báo giá"));
        ensureAssignedEmployee(quote.getRepairTicket(), email, false);
        return history(ticketId);
    }

    private void ensureAssignedEmployee(websuachuadientu.entity.RepairTicket ticket, String email, boolean admin) {
        if (!admin && (ticket.getTechnician() == null || ticket.getTechnician().getUser() == null
                || !ticket.getTechnician().getUser().getEmail().equalsIgnoreCase(email))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "This repair ticket is assigned to another employee");
        }
    }
}
