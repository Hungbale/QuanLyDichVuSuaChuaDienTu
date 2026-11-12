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
import websuachuadientu.repository.AppointmentRepository;
import websuachuadientu.repository.ServiceItemRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RepairTicketService {
    private final RepairTicketRepository ticketRepository;
    private final CustomerRepository customerRepository;
    private final EmployeeRepository employeeRepository;
    private final AppointmentRepository appointmentRepository;
    private final ServiceItemRepository serviceItemRepository;

    @Transactional
    public RepairTicketResponse createForAppointment(websuachuadientu.entity.Appointment appointment) {
        if (ticketRepository.existsByAppointment_Id(appointment.getId())) {
            RepairTicket existing = ticketRepository.findByAppointment_Id(appointment.getId())
                    .orElseThrow(() -> new IllegalStateException("Repair ticket exists but could not be loaded"));
            return toResponse(existing);
        }
        if (appointment.getCustomer() == null || appointment.getTechnician() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Appointment must have a customer and assigned technician before creating a repair ticket");
        }

        RepairTicket ticket = new RepairTicket();
        ticket.setCustomer(appointment.getCustomer());
        ticket.setDevice(appointment.getDevice());
        ticket.setReceivedDate(appointment.getAppointmentDate());
        ticket.setStatus("SCHEDULED");
        ticket.setTechnician(appointment.getTechnician());
        ticket.setAppointment(appointment);
        ticket.setService(appointment.getService());
        ticket = ticketRepository.save(ticket);
        ticket.setTicketCode("PS%05d".formatted(ticket.getId()));
        return toResponse(ticketRepository.save(ticket));
    }

    @Transactional(readOnly = true)
    public List<RepairTicketResponse> search(String keyword, String email, boolean admin) {
        String normalized = keyword == null || keyword.isBlank() ? null : keyword.trim();
        return ticketRepository.search(normalized).stream()
                .filter(ticket -> admin || isAssignedTo(ticket, email))
                .map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public RepairTicketResponse getById(Long id, String email, boolean admin) {
        RepairTicket ticket = findTicket(id);
        ensureAssigned(ticket, email, admin);
        return toResponse(ticket);
    }

    @Transactional
    public RepairTicketResponse create(RepairTicketRequest request) {
        RepairTicket ticket = new RepairTicket();
        if (request.getAppointmentId() != null) {
            var appointment = appointmentRepository.findById(request.getAppointmentId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Appointment not found"));
            if (ticketRepository.existsByAppointment_Id(appointment.getId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "This appointment already has a repair ticket");
            }
            if (appointment.getCustomer() == null) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Appointment is not linked to a customer account");
            }
            if (!"CONFIRMED".equals(appointment.getStatus()) || appointment.getTechnician() == null) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Appointment must be confirmed and assigned before creating a repair ticket");
            }
            ticket.setCustomer(appointment.getCustomer());
            ticket.setDevice(appointment.getDevice());
            ticket.setReceivedDate(request.getReceivedDate());
            ticket.setStatus(request.getStatus().trim());
            ticket.setTechnician(appointment.getTechnician());
            ticket.setAppointment(appointment);
            ticket.setService(appointment.getService());
            appointment.setStatus("CONVERTED");
            appointmentRepository.save(appointment);
        } else {
            apply(ticket, request);
        }
        ticket = ticketRepository.save(ticket);
        ticket.setTicketCode("PS%05d".formatted(ticket.getId()));
        return toResponse(ticketRepository.save(ticket));
    }

    @Transactional
    public RepairTicketResponse update(Long id, RepairTicketRequest request, String email, boolean admin) {
        RepairTicket ticket = findTicket(id);
        ensureAssigned(ticket, email, admin);
        if (!admin && (ticket.getTechnician() == null
                || !ticket.getTechnician().getId().equals(request.getTechnicianId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only an admin can reassign a repair ticket");
        }
        if (!ticket.getStatus().equals(request.getStatus().trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Change ticket status through PATCH /api/repair-tickets/{id}/status with evidence photos");
        }
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
                        ticket.getId(),
                        ticket.getTicketCode(),
                        ticket.getService() == null ? null : ticket.getService().getName(),
                        ticket.getDevice(),
                        ticket.getQuote() == null ? null : ticket.getQuote().getItems().stream()
                                .map(websuachuadientu.entity.RepairQuoteItem::getName)
                                .collect(java.util.stream.Collectors.joining(", ")),
                        ticket.getCompletedDate(),
                        ticket.getQuote() == null ? null : ticket.getQuote().getTotalAmount(),
                        ticket.getStatus(),
                        "/api/repair-tickets/%d/tracking".formatted(ticket.getId())
                ))
                .toList();
    }

    private void apply(RepairTicket ticket, RepairTicketRequest request) {
        if (request.getCustomerId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "customerId is required when no appointmentId is provided");
        }
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
        if (request.getServiceId() != null) {
            ticket.setService(serviceItemRepository.findById(request.getServiceId())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy dịch vụ")));
        }
    }

    private RepairTicket findTicket(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phiếu sửa chữa"));
    }

    private boolean isAssignedTo(RepairTicket ticket, String email) {
        return ticket.getTechnician() != null
                && ticket.getTechnician().getUser() != null
                && ticket.getTechnician().getUser().getEmail().equalsIgnoreCase(email);
    }

    private void ensureAssigned(RepairTicket ticket, String email, boolean admin) {
        if (!admin && !isAssignedTo(ticket, email)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "This repair ticket is assigned to another employee");
        }
    }

    private RepairTicketResponse toResponse(RepairTicket ticket) {
        return new RepairTicketResponse(
                ticket.getId(), ticket.getTicketCode(),
                ticket.getCustomer().getId(), ticket.getCustomer().getFullName(),
                ticket.getService() == null ? null : ticket.getService().getId(),
                ticket.getService() == null ? null : ticket.getService().getName(),
                ticket.getDevice(), ticket.getReceivedDate(), ticket.getStatus(),
                ticket.getTechnician() == null ? null : ticket.getTechnician().getId(),
                ticket.getTechnician() == null ? null : ticket.getTechnician().getFullName()
        );
    }
}
