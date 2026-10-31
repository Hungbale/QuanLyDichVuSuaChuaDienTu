package websuachuadientu.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import websuachuadientu.dto.RepairFinalInspectionRequest;
import websuachuadientu.dto.RepairFinalInspectionResponse;
import websuachuadientu.entity.RepairFinalInspection;
import websuachuadientu.entity.RepairTicketActivity;
import websuachuadientu.enums.RepairTicketStatus;
import websuachuadientu.repository.EmployeeRepository;
import websuachuadientu.repository.AppointmentRepository;
import websuachuadientu.repository.RepairFinalInspectionRepository;
import websuachuadientu.repository.RepairTicketActivityRepository;
import websuachuadientu.repository.RepairTicketRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class RepairFinalInspectionService {
    private final RepairTicketRepository ticketRepository;
    private final RepairFinalInspectionRepository inspectionRepository;
    private final EmployeeRepository employeeRepository;
    private final AppointmentRepository appointmentRepository;
    private final RepairTicketActivityRepository activityRepository;

    @Transactional
    public RepairFinalInspectionResponse save(Long ticketId, RepairFinalInspectionRequest request,
                                             String email, boolean admin) {
        var ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Repair ticket not found"));
        var employee = employeeRepository.findByUser_Email(email).orElse(null);
        ensureAssigned(ticket, employee == null ? null : employee.getId(), email, admin);

        RepairTicketStatus currentStatus;
        try {
            currentStatus = RepairTicketStatus.fromValue(ticket.getStatus());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Current ticket status must be reviewed before final inspection", exception);
        }
        if (currentStatus != RepairTicketStatus.REPAIRING && currentStatus != RepairTicketStatus.IN_PROGRESS) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Final inspection is only available while the ticket is being repaired");
        }

        RepairFinalInspection inspection = inspectionRepository.findByRepairTicket_Id(ticketId)
                .orElseGet(RepairFinalInspection::new);
        inspection.setRepairTicket(ticket);
        inspection.setInspectedBy(employee);
        inspection.setDeviceWorksNormally(request.deviceWorksNormally());
        inspection.setMainFunctionsWork(request.mainFunctionsWork());
        inspection.setNoNewIssues(request.noNewIssues());
        String completionInfo = trimToNull(request.completionInfo());
        inspection.setCompletionInfo(completionInfo);

        boolean complete = Boolean.TRUE.equals(request.complete());
        if (complete && completionInfo == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Completion information is required to complete the repair ticket");
        }
        if (complete && !(inspection.isDeviceWorksNormally()
                && inspection.isMainFunctionsWork() && inspection.isNoNewIssues())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "All final inspection checks must pass before completing the repair ticket");
        }
        if (complete && !currentStatus.canTransitionTo(RepairTicketStatus.COMPLETED)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Repair ticket cannot transition to completed from its current status");
        }

        if (complete) {
            inspection.setCompletedAt(LocalDateTime.now());
            ticket.setStatus(RepairTicketStatus.COMPLETED.storedValue());
            if (ticket.getCompletedDate() == null) {
                ticket.setCompletedDate(LocalDate.now());
            }
            ticketRepository.save(ticket);
            if (ticket.getAppointment() != null) {
                ticket.getAppointment().setStatus("COMPLETED");
                appointmentRepository.save(ticket.getAppointment());
            }
        } else {
            inspection.setCompletedAt(null);
        }
        inspection = inspectionRepository.save(inspection);

        RepairTicketActivity activity = new RepairTicketActivity();
        activity.setRepairTicket(ticket);
        activity.setEmployee(employee);
        activity.setAction(complete ? "REPAIR_COMPLETED" : "FINAL_INSPECTION_RECORDED");
        activity.setDetails("Thiết bị hoạt động bình thường: " + inspection.isDeviceWorksNormally()
                + "; chức năng chính hoạt động: " + inspection.isMainFunctionsWork()
                + "; không có lỗi phát sinh: " + inspection.isNoNewIssues());
        activity.setNote(inspection.getCompletionInfo());
        activityRepository.save(activity);

        return toResponse(inspection);
    }

    @Transactional(readOnly = true)
    public RepairFinalInspectionResponse get(Long ticketId, String email, boolean admin) {
        var ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Repair ticket not found"));
        var employee = employeeRepository.findByUser_Email(email).orElse(null);
        ensureAssigned(ticket, employee == null ? null : employee.getId(), email, admin);
        RepairFinalInspection inspection = inspectionRepository.findByRepairTicket_Id(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Final inspection has not been recorded for this ticket"));
        return toResponse(inspection);
    }

    private void ensureAssigned(websuachuadientu.entity.RepairTicket ticket, Long employeeId,
                                String email, boolean admin) {
        if (!admin && (employeeId == null || ticket.getTechnician() == null
                || !ticket.getTechnician().getId().equals(employeeId))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only the assigned technician can perform final inspection");
        }
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private RepairFinalInspectionResponse toResponse(RepairFinalInspection inspection) {
        var ticket = inspection.getRepairTicket();
        return new RepairFinalInspectionResponse(inspection.getId(), ticket.getId(), ticket.getTicketCode(),
                inspection.isDeviceWorksNormally(), inspection.isMainFunctionsWork(), inspection.isNoNewIssues(),
                inspection.getCompletionInfo(), inspection.getInspectedBy() == null
                ? "Admin" : inspection.getInspectedBy().getFullName(), inspection.getInspectedAt(),
                inspection.getCompletedAt(), ticket.getStatus());
    }
}
