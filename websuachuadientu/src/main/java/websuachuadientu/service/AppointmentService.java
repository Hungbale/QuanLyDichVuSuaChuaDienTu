package websuachuadientu.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import websuachuadientu.dto.AppointmentRequest;
import websuachuadientu.dto.AssignedAppointmentResponse;
import websuachuadientu.entity.Appointment;
import websuachuadientu.entity.Customer;
import websuachuadientu.entity.ServiceItem;
import websuachuadientu.repository.AppointmentRepository;
import websuachuadientu.repository.CustomerRepository;
import websuachuadientu.repository.ServiceItemRepository;
import websuachuadientu.repository.EmployeeRepository;
import websuachuadientu.repository.RepairTicketRepository;
import websuachuadientu.entity.Employee;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final ServiceItemRepository serviceItemRepository;
    private final CustomerRepository customerRepository;
    private final EmployeeRepository employeeRepository;
    private final RepairTicketRepository repairTicketRepository;
    private final RepairTicketService repairTicketService;

    public List<Appointment> getAll() {
        return appointmentRepository.findAllByOrderByAppointmentDateAscAppointmentTimeAsc();
    }

    @Transactional(readOnly = true)
    public List<AssignedAppointmentResponse> getPending() {
        return appointmentRepository.findByStatusOrderByAppointmentDateAscAppointmentTimeAsc("PENDING")
                .stream().map(this::toAssignedResponse).toList();
    }

    public List<Appointment> getByContactPhone(String contactPhone) {
        return appointmentRepository.findByContactPhoneOrderByAppointmentDateAscAppointmentTimeAsc(
                contactPhone.trim());
    }

    public List<Appointment> getByCustomerEmail(String email) {
        return appointmentRepository.findByCustomer_User_EmailOrderByAppointmentDateAscAppointmentTimeAsc(email);
    }

    @Transactional(readOnly = true)
    public List<AssignedAppointmentResponse> getAssignedToEmployee(String email) {
        return appointmentRepository.findByTechnician_User_EmailOrderByAppointmentDateAscAppointmentTimeAsc(email)
                .stream()
                .map(this::toAssignedResponse).toList();
    }

    private AssignedAppointmentResponse toAssignedResponse(Appointment appointment) {
        return new AssignedAppointmentResponse(
                appointment.getId(),
                appointment.getCustomer() == null ? null : appointment.getCustomer().getId(),
                appointment.getCustomer() == null ? null : appointment.getCustomer().getFullName(),
                appointment.getDevice(),
                appointment.getService().getId(),
                appointment.getService().getName(),
                appointment.getAppointmentDate(),
                appointment.getAppointmentTime(),
                appointment.getServiceMethod(),
                appointment.getContactPhone(),
                appointment.getProblemDescription(),
                appointment.getPickupAddress(),
                appointment.getStatus());
    }

    @Transactional
    public Appointment create(AppointmentRequest request, String userEmail, boolean customerAccount) {
        Appointment appointment = new Appointment();
        updateAppointment(appointment, request);
        appointment.setStatus("PENDING");
        if (customerAccount) {
            Customer customer = customerRepository.findByUser_Email(userEmail)
                    .orElseThrow(() -> new IllegalStateException("Không tìm thấy hồ sơ khách hàng"));
            appointment.setCustomer(customer);
        }
        if (!customerAccount && request.getCustomerId() != null) {
            Customer customer = customerRepository.findById(request.getCustomerId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Customer not found"));
            appointment.setCustomer(customer);
        }
        if (!customerAccount && request.getCustomerId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "customerId is required when staff creates an appointment");
        }
        return appointmentRepository.save(appointment);
    }

    @Transactional
    public Appointment updateByCustomer(Long appointmentId, String userEmail, AppointmentRequest request) {
        Appointment appointment = getPendingAppointmentForCustomer(appointmentId, userEmail);
        updateAppointment(appointment, request);
        return appointmentRepository.save(appointment);
    }

    @Transactional
    public void cancelByCustomer(Long appointmentId, String userEmail) {
        Appointment appointment = getPendingAppointmentForCustomer(appointmentId, userEmail);
        appointment.setStatus("CANCELLED");
        appointmentRepository.save(appointment);
    }

    @Transactional
    public Appointment assignLeastBusyTechnician(Long appointmentId) {
        Appointment appointment = appointmentRepository.findPendingById(appointmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                        "Appointment was not found or is no longer pending"));
        if (appointment.getAppointmentDate().isBefore(java.time.LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Past appointments cannot be assigned");
        }
        if (appointment.getAppointmentDate().isEqual(java.time.LocalDate.now())
                && !appointment.getAppointmentTime().isAfter(java.time.LocalTime.now())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Past appointment times cannot be assigned");
        }
        if (appointment.getCustomer() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Appointment must be linked to a customer before confirmation");
        }
        List<String> activeAppointmentStatuses = List.of("CONFIRMED", "IN_PROGRESS");
        List<String> busyAppointmentStatuses = List.of("CONFIRMED", "IN_PROGRESS", "CONVERTED");
        List<String> terminalTicketStatuses = List.of(
                "COMPLETED", "Hoàn thành", "CANCELLED", "Khách từ chối");

        Employee technician = employeeRepository.findByStatus("ACTIVE").stream()
                .filter(employee -> !appointmentRepository
                        .existsByTechnician_IdAndAppointmentDateAndAppointmentTimeAndStatusIn(
                                employee.getId(), appointment.getAppointmentDate(),
                                appointment.getAppointmentTime(), busyAppointmentStatuses))
                .min(java.util.Comparator
                        .comparingLong((Employee employee) ->
                                repairTicketRepository.countByTechnician_IdAndStatusNotIn(
                                        employee.getId(), terminalTicketStatuses)
                                        + appointmentRepository.countUnconvertedWorkByTechnician(
                                        employee.getId(), activeAppointmentStatuses))
                        .thenComparing(Employee::getId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                        "No active technician is available for this time slot"));

        appointment.setTechnician(technician);
        appointment.setStatus("CONFIRMED");
        Appointment assigned = appointmentRepository.save(appointment);
        repairTicketService.createForAppointment(assigned);
        return assigned;
    }

    @Transactional
    public Appointment assignToEmployee(Long appointmentId, String employeeEmail) {
        Appointment appointment = appointmentRepository.findPendingById(appointmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                        "Appointment was not found or is no longer pending"));
        if (appointment.getAppointmentDate().isBefore(java.time.LocalDate.now())
                || (appointment.getAppointmentDate().isEqual(java.time.LocalDate.now())
                && !appointment.getAppointmentTime().isAfter(java.time.LocalTime.now()))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Past appointment times cannot be assigned");
        }
        if (appointment.getCustomer() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Appointment must be linked to a customer before confirmation");
        }
        Employee technician = employeeRepository.findByUser_Email(employeeEmail)
                .filter(employee -> "ACTIVE".equals(employee.getStatus()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Only an active employee can confirm an appointment"));
        List<String> busyStatuses = List.of("CONFIRMED", "IN_PROGRESS", "CONVERTED");
        if (appointmentRepository.existsByTechnician_IdAndAppointmentDateAndAppointmentTimeAndStatusIn(
                technician.getId(), appointment.getAppointmentDate(), appointment.getAppointmentTime(), busyStatuses)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "You already have work assigned for this time slot");
        }
        appointment.setTechnician(technician);
        appointment.setStatus("CONFIRMED");
        Appointment confirmed = appointmentRepository.save(appointment);
        repairTicketService.createForAppointment(confirmed);
        return confirmed;
    }

    private Appointment getPendingAppointmentForCustomer(Long appointmentId, String userEmail) {
        Appointment appointment = appointmentRepository.findByIdAndCustomer_User_Email(appointmentId, userEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy lịch hẹn"));
        if (!"PENDING".equals(appointment.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Chỉ có thể sửa hoặc hủy lịch hẹn đang chờ xác nhận");
        }
        return appointment;
    }

    private void updateAppointment(Appointment appointment, AppointmentRequest request) {
        if (request.getAppointmentDate().isBefore(java.time.LocalDate.now())
                || (request.getAppointmentDate().isEqual(java.time.LocalDate.now())
                && !request.getAppointmentTime().isAfter(java.time.LocalTime.now()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Appointment date and time must be in the future");
        }
        ServiceItem service = serviceItemRepository.findById(request.getServiceId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy dịch vụ"));
        if (!"ACTIVE".equals(service.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dịch vụ hiện không hoạt động");
        }
        if ("HOME_PICKUP".equals(request.getServiceMethod())
                && (request.getPickupAddress() == null || request.getPickupAddress().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập địa chỉ nhận máy");
        }

        appointment.setDevice(request.getDevice().trim());
        appointment.setService(service);
        appointment.setAppointmentDate(request.getAppointmentDate());
        appointment.setAppointmentTime(request.getAppointmentTime());
        appointment.setServiceMethod(request.getServiceMethod());
        appointment.setContactPhone(request.getContactPhone().trim());
        appointment.setProblemDescription(request.getProblemDescription().trim());
        appointment.setPickupAddress(request.getPickupAddress() == null
                ? null : request.getPickupAddress().trim());
    }
}
