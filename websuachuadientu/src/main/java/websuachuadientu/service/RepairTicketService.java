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
import websuachuadientu.entity.RepairTicketActivity;
import websuachuadientu.dto.RepairTicketActivityResponse;
import websuachuadientu.repository.CustomerRepository;
import websuachuadientu.repository.EmployeeRepository;
import websuachuadientu.repository.RepairTicketRepository;
import websuachuadientu.repository.AppointmentRepository;
import websuachuadientu.repository.ServiceItemRepository;
import websuachuadientu.repository.RepairTicketActivityRepository;
import websuachuadientu.enums.RepairTicketStatus;
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
    private final RepairTicketActivityRepository activityRepository;

    @Transactional
    public RepairTicketResponse createForAppointment(websuachuadientu.entity.Appointment appointment) {
        if (ticketRepository.existsByAppointment_Id(appointment.getId())) {
            RepairTicket existing = ticketRepository.findByAppointment_Id(appointment.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                            "Appointment already has a repair ticket; refresh and try again"));
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
        ticket.setStatus(RepairTicketStatus.SCHEDULED.storedValue());
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
        if (request.getStatus() != RepairTicketStatus.SCHEDULED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A new repair ticket must start in SCHEDULED status");
        }
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
            ticket.setReceivedDate(appointment.getAppointmentDate());
            ticket.setStatus(RepairTicketStatus.SCHEDULED.storedValue());
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
        if (!ticket.getStatus().equals(request.getStatus().storedValue())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Change ticket status through PATCH /api/repair-tickets/{id}/status with evidence photos");
        }
        if (ticket.getAppointment() != null) {
            var linkedAppointment = ticket.getAppointment();
            if (!ticket.getDevice().equals(request.getDevice().trim())
                    || !ticket.getReceivedDate().equals(request.getReceivedDate())
                    || !ticket.getCustomer().getId().equals(request.getCustomerId())
                    || (request.getServiceId() != null && !java.util.Objects.equals(
                    ticket.getService() == null ? null : ticket.getService().getId(), request.getServiceId()))) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Device, customer, date, and service on an appointment-linked ticket cannot be edited independently");
            }
            if (admin && (request.getTechnicianId() == null
                    || linkedAppointment.getTechnician() == null
                    || !linkedAppointment.getTechnician().getId().equals(request.getTechnicianId()))) {
                if (request.getTechnicianId() == null) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "An appointment-linked ticket must keep its assigned technician");
                }
                linkedAppointment.setTechnician(employeeRepository.findById(request.getTechnicianId())
                        .filter(employee -> "ACTIVE".equals(employee.getStatus()))
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                "Technician does not exist or is inactive")));
                appointmentRepository.save(linkedAppointment);
            }
        }
        if (!admin && (!ticket.getDevice().equals(request.getDevice().trim())
                || !ticket.getReceivedDate().equals(request.getReceivedDate())
                || !ticket.getCustomer().getId().equals(request.getCustomerId())
                || (request.getServiceId() != null && !java.util.Objects.equals(
                ticket.getService() == null ? null : ticket.getService().getId(), request.getServiceId())))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only admin can change the customer, device, service, or received date");
        }
        List<String> changedFields = new java.util.ArrayList<>();
        if (!ticket.getDevice().equals(request.getDevice().trim())) {
            changedFields.add("device: " + ticket.getDevice() + " -> " + request.getDevice().trim());
        }
        if (!ticket.getReceivedDate().equals(request.getReceivedDate())) {
            changedFields.add("receivedDate: " + ticket.getReceivedDate() + " -> " + request.getReceivedDate());
        }
        if (!ticket.getCustomer().getId().equals(request.getCustomerId())) {
            changedFields.add("customerId: " + ticket.getCustomer().getId() + " -> " + request.getCustomerId());
        }
        if (request.getTechnicianId() == null
                ? ticket.getTechnician() != null
                : ticket.getTechnician() == null || !ticket.getTechnician().getId().equals(request.getTechnicianId())) {
            changedFields.add("technicianId: "
                    + (ticket.getTechnician() == null ? null : ticket.getTechnician().getId())
                    + " -> " + request.getTechnicianId());
        }
        if (request.getServiceId() != null
                && (ticket.getService() == null || !ticket.getService().getId().equals(request.getServiceId()))) {
            changedFields.add("serviceId: "
                    + (ticket.getService() == null ? null : ticket.getService().getId())
                    + " -> " + request.getServiceId());
        }
        apply(ticket, request);
        if (request.getStatus() == RepairTicketStatus.COMPLETED && ticket.getCompletedDate() == null) {
            ticket.setCompletedDate(java.time.LocalDate.now());
        }
        RepairTicket saved = ticketRepository.save(ticket);
        if (!changedFields.isEmpty() || (request.getNote() != null && !request.getNote().isBlank())) {
            RepairTicketActivity activity = new RepairTicketActivity();
            activity.setRepairTicket(saved);
            activity.setEmployee(employeeRepository.findByUser_Email(email).orElse(null));
            activity.setAction("TICKET_UPDATED");
            activity.setDetails(changedFields.isEmpty() ? null : String.join(" | ", changedFields));
            activity.setNote(request.getNote() == null || request.getNote().isBlank()
                    ? null : request.getNote().trim());
            activityRepository.save(activity);
        }
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<RepairTicketActivityResponse> getHistory(Long id, String email, boolean admin) {
        RepairTicket ticket = findTicket(id);
        ensureAssigned(ticket, email, admin);
        return activityRepository.findByRepairTicket_IdOrderByCreatedAtAscIdAsc(id).stream()
                .map(activity -> new RepairTicketActivityResponse(
                        activity.getId(), activity.getAction(), activity.getDetails(), activity.getNote(),
                        activity.getEmployee() == null
                                ? (activity.getAction().startsWith("CUSTOMER_") ? "Khách hàng" : "Admin")
                                : activity.getEmployee().getFullName(),
                        activity.getCreatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RepairHistoryResponse> getMyHistory(String email) {
        var customer = customerRepository.findByUser_Email(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Tài khoản không thuộc hồ sơ khách hàng nào"));
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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy khách hàng"));
        Employee technician = null;
        if (request.getTechnicianId() != null) {
            technician = employeeRepository.findById(request.getTechnicianId())
                    .filter(employee -> "ACTIVE".equals(employee.getStatus()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Technician does not exist or is inactive"));
        }
        ticket.setCustomer(customer);
        ticket.setDevice(request.getDevice().trim());
        ticket.setReceivedDate(request.getReceivedDate());
        ticket.setStatus(request.getStatus().storedValue());
        ticket.setTechnician(technician);
        if (request.getServiceId() != null) {
            ticket.setService(serviceItemRepository.findById(request.getServiceId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy dịch vụ")));
        }
    }

    private RepairTicket findTicket(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phiếu sửa chữa"));
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
