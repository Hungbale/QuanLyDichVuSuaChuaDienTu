package websuachuadientu.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import websuachuadientu.dto.RepairIntakeRequest;
import websuachuadientu.dto.RepairIntakeResponse;
import websuachuadientu.dto.RepairStatusPhotoResponse;
import websuachuadientu.entity.RepairIntakePhoto;
import websuachuadientu.entity.RepairIntakeReceipt;
import websuachuadientu.enums.RepairTicketStatus;
import websuachuadientu.repository.EmployeeRepository;
import websuachuadientu.repository.RepairIntakeReceiptRepository;
import websuachuadientu.repository.RepairTicketActivityRepository;
import websuachuadientu.repository.RepairTicketRepository;
import websuachuadientu.repository.AppointmentRepository;

import java.io.IOException;
import java.util.Base64;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RepairIntakeService {
    private final RepairTicketRepository ticketRepository;
    private final RepairIntakeReceiptRepository intakeRepository;
    private final EmployeeRepository employeeRepository;
    private final RepairTicketActivityRepository activityRepository;
    private final AppointmentRepository appointmentRepository;

    @Transactional
    public RepairIntakeResponse receive(Long ticketId, RepairIntakeRequest request, List<MultipartFile> images,
                                        String email, boolean admin) {
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
        if (images == null || images.isEmpty() || images.size() > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Attach between 1 and 5 intake photos");
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
        for (MultipartFile image : images) {
            receipt.getPhotos().add(toPhoto(image, receipt));
        }
        receipt = intakeRepository.save(receipt);

        ticket.setStatus(RepairTicketStatus.RECEIVED.storedValue());
        ticketRepository.save(ticket);
        if (ticket.getAppointment() != null) {
            ticket.getAppointment().setStatus("RECEIVED");
            appointmentRepository.save(ticket.getAppointment());
        }

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

    private RepairIntakePhoto toPhoto(MultipartFile file, RepairIntakeReceipt receipt) {
        if (file == null || file.isEmpty() || file.getSize() > 5L * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Each intake photo must be non-empty and no larger than 5 MB");
        }
        String contentType = file.getContentType();
        try {
            byte[] data = file.getBytes();
            boolean jpeg = "image/jpeg".equalsIgnoreCase(contentType)
                    && data.length >= 3 && (data[0] & 0xff) == 0xff
                    && (data[1] & 0xff) == 0xd8 && (data[2] & 0xff) == 0xff;
            boolean png = "image/png".equalsIgnoreCase(contentType)
                    && data.length >= 8 && (data[0] & 0xff) == 0x89
                    && data[1] == 0x50 && data[2] == 0x4e && data[3] == 0x47
                    && data[4] == 0x0d && data[5] == 0x0a && data[6] == 0x1a && data[7] == 0x0a;
            if (!jpeg && !png) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Only valid JPEG and PNG intake photos are supported");
            }
            RepairIntakePhoto photo = new RepairIntakePhoto();
            photo.setIntakeReceipt(receipt);
            photo.setContentType(contentType.toLowerCase());
            String originalName = file.getOriginalFilename();
            photo.setFileName(originalName == null ? "photo" : originalName.replaceAll("[^A-Za-z0-9._-]", "_"));
            photo.setData(data);
            return photo;
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read intake photo");
        }
    }

    private RepairIntakeResponse toResponse(RepairIntakeReceipt receipt) {
        var ticket = receipt.getRepairTicket();
        List<RepairStatusPhotoResponse> photos = receipt.getPhotos().stream().map(photo -> {
            String dataUri = "data:" + photo.getContentType() + ";base64,"
                    + Base64.getEncoder().encodeToString(photo.getData());
            return new RepairStatusPhotoResponse(photo.getFileName(), photo.getContentType(), dataUri);
        }).toList();
        return new RepairIntakeResponse(receipt.getId(), ticket.getId(), ticket.getTicketCode(),
                ticket.getCustomer().getFullName(), ticket.getDevice(), receipt.getSerialNumber(),
                receipt.getAppearanceCondition(), receipt.getIncludedAccessories(),
                receipt.getCustomerReportedIssue(), receipt.getIntakeNote(),
                receipt.getReceivedBy() == null ? "Admin" : receipt.getReceivedBy().getFullName(),
                receipt.getReceivedAt(), photos);
    }
}
