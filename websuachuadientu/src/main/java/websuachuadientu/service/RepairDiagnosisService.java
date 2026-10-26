package websuachuadientu.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import websuachuadientu.dto.RepairDiagnosisRequest;
import websuachuadientu.dto.RepairDiagnosisResponse;
import websuachuadientu.entity.RepairDiagnosis;
import websuachuadientu.entity.RepairTicketActivity;
import websuachuadientu.enums.RepairTicketStatus;
import websuachuadientu.repository.EmployeeRepository;
import websuachuadientu.repository.RepairDiagnosisRepository;
import websuachuadientu.repository.RepairIntakeReceiptRepository;
import websuachuadientu.repository.RepairTicketActivityRepository;
import websuachuadientu.repository.RepairTicketRepository;

@Service
@RequiredArgsConstructor
public class RepairDiagnosisService {
    private final RepairTicketRepository ticketRepository;
    private final RepairDiagnosisRepository diagnosisRepository;
    private final RepairIntakeReceiptRepository intakeRepository;
    private final EmployeeRepository employeeRepository;
    private final RepairTicketActivityRepository activityRepository;

    @Transactional
    public RepairDiagnosisResponse save(Long ticketId, RepairDiagnosisRequest request,
                                       String email, boolean admin) {
        var ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Repair ticket not found"));
        ensureAssigned(ticket, email, admin);
        if (!intakeRepository.existsByRepairTicket_Id(ticketId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Receive the device before recording a diagnosis");
        }
        RepairTicketStatus currentStatus;
        try {
            currentStatus = RepairTicketStatus.fromValue(ticket.getStatus());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Current ticket status must be reviewed before diagnosis", exception);
        }
        if (currentStatus != RepairTicketStatus.RECEIVED
                && currentStatus != RepairTicketStatus.DIAGNOSING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Diagnosis can only be recorded for a received or diagnosing ticket");
        }

        var employee = employeeRepository.findByUser_Email(email).orElse(null);
        var diagnosis = diagnosisRepository.findByRepairTicket_Id(ticketId).orElseGet(RepairDiagnosis::new);
        boolean creating = diagnosis.getId() == null;
        diagnosis.setRepairTicket(ticket);
        diagnosis.setDiagnosedBy(employee);
        diagnosis.setDiagnosisResult(request.diagnosisResult().trim());
        diagnosis.setRepairProposal(request.repairProposal().trim());
        diagnosis.setTechnicalNote(trimToNull(request.technicalNote()));
        diagnosis = diagnosisRepository.save(diagnosis);

        ticket.setStatus(RepairTicketStatus.DIAGNOSING.storedValue());
        ticketRepository.save(ticket);

        RepairTicketActivity activity = new RepairTicketActivity();
        activity.setRepairTicket(ticket);
        activity.setEmployee(employee);
        activity.setAction(creating ? "DIAGNOSIS_RECORDED" : "DIAGNOSIS_UPDATED");
        activity.setDetails("Diagnosis result and repair proposal saved");
        activity.setNote(diagnosis.getTechnicalNote());
        activityRepository.save(activity);
        return toResponse(diagnosis);
    }

    @Transactional(readOnly = true)
    public RepairDiagnosisResponse get(Long ticketId, String email, boolean admin) {
        var ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Repair ticket not found"));
        ensureAssigned(ticket, email, admin);
        var diagnosis = diagnosisRepository.findByRepairTicket_Id(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Diagnosis has not been recorded for this ticket"));
        return toResponse(diagnosis);
    }

    private void ensureAssigned(websuachuadientu.entity.RepairTicket ticket, String email, boolean admin) {
        if (!admin && (ticket.getTechnician() == null || ticket.getTechnician().getUser() == null
                || !ticket.getTechnician().getUser().getEmail().equalsIgnoreCase(email))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only the assigned technician can diagnose this repair ticket");
        }
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private RepairDiagnosisResponse toResponse(RepairDiagnosis diagnosis) {
        var ticket = diagnosis.getRepairTicket();
        String issue = intakeRepository.findByRepairTicket_Id(ticket.getId())
                .map(receipt -> receipt.getIntakeNote() != null && !receipt.getIntakeNote().isBlank()
                        ? receipt.getIntakeNote() : receipt.getCustomerReportedIssue())
                .orElseGet(() -> ticket.getAppointment() == null
                        ? null : ticket.getAppointment().getProblemDescription());
        return new RepairDiagnosisResponse(diagnosis.getId(), ticket.getId(), ticket.getTicketCode(),
                ticket.getDevice(), ticket.getCustomer().getFullName(), issue,
                diagnosis.getDiagnosisResult(), diagnosis.getRepairProposal(), diagnosis.getTechnicalNote(),
                diagnosis.getDiagnosedBy() == null ? "Admin" : diagnosis.getDiagnosedBy().getFullName(),
                diagnosis.getDiagnosedAt(), ticket.getStatus());
    }
}
