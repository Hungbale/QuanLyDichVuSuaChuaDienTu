package websuachuadientu.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import websuachuadientu.dto.RepairIntakeRequest;
import websuachuadientu.dto.RepairIntakeResponse;
import websuachuadientu.entity.RepairIntakeReceipt;
import websuachuadientu.enums.RepairTicketStatus;
import websuachuadientu.repository.EmployeeRepository;
import websuachuadientu.repository.RepairIntakeReceiptRepository;
import websuachuadientu.repository.RepairTicketActivityRepository;
import websuachuadientu.repository.RepairTicketRepository;

@Service
@RequiredArgsConstructor
public class RepairIntakeService {
    private final RepairTicketRepository ticketRepository;
    private final RepairIntakeReceiptRepository intakeRepository;
    private final EmployeeRepository employeeRepository;
    private final RepairTicketActivityRepository activityRepository;

    @Transactional
    public RepairIntakeResponse receive(Long ticketId, RepairIntakeRequest request, String email, boolean admin) {
        var ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Repair ticket not found"));
        ensureCanReceive(ticket, email, admin);
        if (ticket.getAppointment() != null
                && "CANCELLATION_REQUESTED".equals(ticket.getAppointment().getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Resolve the appointment cancellation request before receiving the device");
        }
        if (intakeRepository.existsByRepairTicket_Id(ticketId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This repair ticket already has an intake receipt");
        }
        if (RepairTicketStatus.fromValue(ticket.getStatus()) != RepairTicketStatus.SCHEDULED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only a scheduled repair ticket can be received");
        }

        var employee = employeeRepository.findByUser_Email(email).orElse(null);
        RepairIntakeReceipt receipt = new RepairIntakeReceipt();
        receipt.setRepairTicket(ticket);
        receipt.setReceivedBy(employee);
        receipt.setSerialNumber(trimToNull(request.serialNumber()));
        receipt.setAppearanceCondition(request.appearanceCondition().trim());
        receipt.setIncludedAccessories(trimToNull(request.includedAccessories()));
        String reportedIssue = request.customerReportedIssue();
        if ((reportedIssue == null || reportedIssue.isBlank())
                && ticket.getAppointment() != null) {
            reportedIssue = ticket.getAppointment().getProblemDescription();
        }
        receipt.setCustomerReportedIssue(trimToNull(reportedIssue));
        receipt.setIntakeNote(trimToNull(request.intakeNote()));
        receipt = intakeRepository.save(receipt);

        ticket.setStatus(RepairTicketStatus.RECEIVED.storedValue());
        ticketRepository.save(ticket);

        var activity = new websuachuadientu.entity.RepairTicketActivity();
        activity.setRepairTicket(ticket);
        activity.setEmployee(employee);
        activity.setAction("DEVICE_RECEIVED");
        activity.setDetails("Device intake receipt created");
        activity.setNote(receipt.getIntakeNote());
        activityRepository.save(activity);

        return toResponse(receipt);
    }

    @Transactional(readOnly = true)
    public RepairIntakeResponse getByTicket(Long ticketId, String email, boolean admin) {
        var ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Repair ticket not found"));
        ensureCanReceive(ticket, email, admin);
        var receipt = intakeRepository.findByRepairTicket_Id(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Intake receipt not found"));
        return toResponse(receipt);
    }

    private void ensureCanReceive(websuachuadientu.entity.RepairTicket ticket, String email, boolean admin) {
        if (!admin && (ticket.getTechnician() == null || ticket.getTechnician().getUser() == null
                || !ticket.getTechnician().getUser().getEmail().equalsIgnoreCase(email))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only the assigned technician can receive this device");
        }
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private RepairIntakeResponse toResponse(RepairIntakeReceipt receipt) {
        var ticket = receipt.getRepairTicket();
        return new RepairIntakeResponse(receipt.getId(), ticket.getId(), ticket.getTicketCode(),
                ticket.getCustomer().getFullName(), ticket.getDevice(), receipt.getSerialNumber(),
                receipt.getAppearanceCondition(), receipt.getIncludedAccessories(),
                receipt.getCustomerReportedIssue(), receipt.getIntakeNote(),
                receipt.getReceivedBy() == null ? "Admin" : receipt.getReceivedBy().getFullName(),
                receipt.getReceivedAt());
    }
}
