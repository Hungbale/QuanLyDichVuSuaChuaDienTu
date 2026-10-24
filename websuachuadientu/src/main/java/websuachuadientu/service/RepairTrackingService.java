package websuachuadientu.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import websuachuadientu.dto.RepairStatusPhotoResponse;
import websuachuadientu.dto.RepairStatusUpdateResponse;
import websuachuadientu.dto.RepairTrackingResponse;
import websuachuadientu.entity.Employee;
import websuachuadientu.entity.RepairStatusPhoto;
import websuachuadientu.entity.RepairStatusUpdate;
import websuachuadientu.repository.EmployeeRepository;
import websuachuadientu.repository.RepairStatusUpdateRepository;
import websuachuadientu.repository.RepairTicketRepository;
import websuachuadientu.repository.AppointmentRepository;
import websuachuadientu.enums.RepairTicketStatus;

import java.io.IOException;
import java.time.LocalDate;
import java.util.Base64;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RepairTrackingService {
    private static final int MAX_PHOTOS = 5;
    private static final long MAX_PHOTO_BYTES = 5L * 1024 * 1024;

    private final RepairTicketRepository ticketRepository;
    private final AppointmentRepository appointmentRepository;
    private final RepairStatusUpdateRepository updateRepository;
    private final EmployeeRepository employeeRepository;

    @Transactional
    public RepairStatusUpdateResponse updateStatus(
            Long ticketId, String status, String note, List<MultipartFile> images,
            String actorEmail, boolean admin) {
        var ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Repair ticket not found"));
        if (ticket.getAppointment() != null
                && "CANCELLATION_REQUESTED".equals(ticket.getAppointment().getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Resolve the appointment cancellation request before changing the ticket status");
        }
        Employee employee = employeeRepository.findByUser_Email(actorEmail)
                .orElse(null);
        if (!admin && (employee == null || ticket.getTechnician() == null
                || !ticket.getTechnician().getId().equals(employee.getId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only the assigned technician can update this repair ticket");
        }
        RepairTicketStatus requestedStatus;
        try {
            requestedStatus = RepairTicketStatus.fromValue(status);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unsupported repair ticket status", exception);
        }
        if (requestedStatus == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status is required");
        }
        if (requestedStatus == RepairTicketStatus.RECEIVED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Use POST /api/repair-tickets/{id}/intake to receive a device");
        }
        String nextStatus = requestedStatus.storedValue();
        if (nextStatus.equals(ticket.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The ticket is already in this status");
        }
        RepairTicketStatus currentStatus;
        try {
            currentStatus = RepairTicketStatus.fromValue(ticket.getStatus());
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Current ticket status must be reviewed before it can be changed", exception);
        }
        boolean statusHasDedicatedWorkflow = requestedStatus == RepairTicketStatus.DIAGNOSING
                || requestedStatus == RepairTicketStatus.WAITING_FOR_QUOTE_APPROVAL
                || requestedStatus == RepairTicketStatus.CUSTOMER_DECLINED
                || (requestedStatus == RepairTicketStatus.REPAIRING
                && currentStatus != RepairTicketStatus.WAITING_FOR_PARTS);
        if (statusHasDedicatedWorkflow) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Use the intake, diagnosis, or quote API for this status transition");
        }
        if (currentStatus == null || !currentStatus.canTransitionTo(requestedStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Repair ticket status transition is not allowed");
        }
        if (images == null || images.isEmpty() || images.size() > MAX_PHOTOS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Attach between 1 and 5 photos for every status update");
        }
        if (note != null && note.length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Note must be at most 2000 characters");
        }
        RepairStatusUpdate update = new RepairStatusUpdate();
        update.setRepairTicket(ticket);
        update.setEmployee(employee);
        update.setStatus(nextStatus);
        update.setNote(note == null || note.isBlank() ? null : note.trim());
        for (MultipartFile image : images) {
            update.getPhotos().add(toPhoto(image, update));
        }

        ticket.setStatus(nextStatus);
        if (requestedStatus == RepairTicketStatus.COMPLETED && ticket.getCompletedDate() == null) {
            ticket.setCompletedDate(LocalDate.now());
        }
        ticketRepository.save(ticket);
        if (requestedStatus == RepairTicketStatus.CANCELLED && ticket.getAppointment() != null) {
            ticket.getAppointment().setStatus("CANCELLED");
            appointmentRepository.save(ticket.getAppointment());
        }
        return toResponse(updateRepository.save(update));
    }

    @Transactional(readOnly = true)
    public RepairTrackingResponse getTracking(Long ticketId, String email, boolean customer, boolean admin) {
        var ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Repair ticket not found"));
        if (customer && (ticket.getCustomer() == null || ticket.getCustomer().getUser() == null
                || !ticket.getCustomer().getUser().getEmail().equalsIgnoreCase(email))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You can only view tracking for your own repair ticket");
        }
        if (!customer && !admin && (ticket.getTechnician() == null
                || ticket.getTechnician().getUser() == null
                || !ticket.getTechnician().getUser().getEmail().equalsIgnoreCase(email))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "This repair ticket is assigned to another employee");
        }
        List<RepairStatusUpdateResponse> updates = updateRepository
                .findByRepairTicket_IdOrderByCreatedAtAsc(ticketId).stream()
                .map(this::toResponse).toList();
        return new RepairTrackingResponse(ticket.getId(), ticket.getTicketCode(),
                ticket.getService() == null ? null : ticket.getService().getName(), ticket.getDevice(),
                ticket.getStatus(), updates);
    }

    private RepairStatusPhoto toPhoto(MultipartFile file, RepairStatusUpdate update) {
        if (file == null || file.isEmpty() || file.getSize() > MAX_PHOTO_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Each photo must be non-empty and no larger than 5 MB");
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
                        "Only valid JPEG and PNG photos are supported");
            }
            RepairStatusPhoto photo = new RepairStatusPhoto();
            photo.setStatusUpdate(update);
            photo.setContentType(contentType.toLowerCase());
            String originalName = file.getOriginalFilename();
            photo.setFileName(originalName == null ? "photo" : originalName.replaceAll("[^A-Za-z0-9._-]", "_"));
            photo.setData(data);
            return photo;
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read uploaded photo");
        }
    }

    private RepairStatusUpdateResponse toResponse(RepairStatusUpdate update) {
        List<RepairStatusPhotoResponse> photos = update.getPhotos().stream().map(photo -> {
            String dataUri = "data:" + photo.getContentType() + ";base64,"
                    + Base64.getEncoder().encodeToString(photo.getData());
            return new RepairStatusPhotoResponse(photo.getFileName(), photo.getContentType(), dataUri);
        }).toList();
        return new RepairStatusUpdateResponse(update.getId(), update.getStatus(), update.getNote(),
                update.getCreatedAt(), update.getEmployee() == null ? "Admin" : update.getEmployee().getFullName(), photos);
    }

}
