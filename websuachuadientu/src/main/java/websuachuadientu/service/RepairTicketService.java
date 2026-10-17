package websuachuadientu.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import websuachuadientu.dto.RepairTicketRequest;
import websuachuadientu.dto.RepairTicketResponse;
import websuachuadientu.dto.RepairHistoryResponse;
import websuachuadientu.entity.Customer;
import websuachuadientu.entity.Employee;
import websuachuadientu.entity.RepairTicket;
import websuachuadientu.repository.CustomerRepository;
import websuachuadientu.repository.EmployeeRepository;
import websuachuadientu.repository.RepairTicketRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RepairTicketService {
    private final RepairTicketRepository ticketRepository;
    private final CustomerRepository customerRepository;
    private final EmployeeRepository employeeRepository;

    @Transactional(readOnly = true)
    public List<RepairTicketResponse> search(String keyword) {
        String normalized = keyword == null || keyword.isBlank() ? null : keyword.trim();
        return ticketRepository.search(normalized).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public RepairTicketResponse getById(Long id) {
        return toResponse(findTicket(id));
    }

    @Transactional
    public RepairTicketResponse create(RepairTicketRequest request) {
        RepairTicket ticket = new RepairTicket();
        apply(ticket, request);
        ticket = ticketRepository.save(ticket);
        ticket.setTicketCode("PS%05d".formatted(ticket.getId()));
        return toResponse(ticketRepository.save(ticket));
    }

    @Transactional
    public RepairTicketResponse update(Long id, RepairTicketRequest request) {
        RepairTicket ticket = findTicket(id);
        apply(ticket, request);
        if (("Hoàn thành".equalsIgnoreCase(request.getStatus())
                || "COMPLETED".equalsIgnoreCase(request.getStatus()))
                && ticket.getCompletedDate() == null) {
            ticket.setCompletedDate(java.time.LocalDate.now());
        }
        return toResponse(ticketRepository.save(ticket));
    }

    @Transactional(readOnly = true)
    public List<RepairHistoryResponse> getMyHistory(String email) {
        var customer = customerRepository.findByUser_Email(email)
                .orElseThrow(() -> new IllegalArgumentException("Tài khoản không thuộc khách hàng nào"));
        return ticketRepository.findByCustomer_IdOrderByReceivedDateDescIdDesc(customer.getId())
                .stream()
                .map(ticket -> new RepairHistoryResponse(
                        ticket.getTicketCode(),
                        ticket.getDevice(),
                        ticket.getQuote() == null ? null : ticket.getQuote().getItems().stream()
                                .map(websuachuadientu.entity.RepairQuoteItem::getName)
                                .collect(java.util.stream.Collectors.joining(", ")),
                        ticket.getCompletedDate(),
                        ticket.getQuote() == null ? null : ticket.getQuote().getTotalAmount(),
                        ticket.getStatus()
                ))
                .toList();
    }

    private void apply(RepairTicket ticket, RepairTicketRequest request) {
        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy khách hàng"));
        Employee technician = null;
        if (request.getTechnicianId() != null) {
            technician = employeeRepository.findById(request.getTechnicianId())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy kỹ thuật viên"));
        }
        ticket.setCustomer(customer);
        ticket.setDevice(request.getDevice().trim());
        ticket.setReceivedDate(request.getReceivedDate());
        ticket.setStatus(request.getStatus().trim());
        ticket.setTechnician(technician);
    }

    private RepairTicket findTicket(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phiếu sửa chữa"));
    }

    private RepairTicketResponse toResponse(RepairTicket ticket) {
        return new RepairTicketResponse(
                ticket.getId(), ticket.getTicketCode(),
                ticket.getCustomer().getId(), ticket.getCustomer().getFullName(),
                ticket.getDevice(), ticket.getReceivedDate(), ticket.getStatus(),
                ticket.getTechnician() == null ? null : ticket.getTechnician().getId(),
                ticket.getTechnician() == null ? null : ticket.getTechnician().getFullName()
        );
    }
}
