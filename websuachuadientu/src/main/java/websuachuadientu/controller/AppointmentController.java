package websuachuadientu.controller;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import websuachuadientu.dto.AppointmentRequest;
import websuachuadientu.dto.AssignedAppointmentResponse;
import websuachuadientu.dto.AssignedAppointmentGroupsResponse;
import websuachuadientu.dto.AppointmentAvailabilityResponse;
import websuachuadientu.dto.AppointmentCancellationReasonRequest;
import websuachuadientu.dto.AppointmentCancellationRequest;
import websuachuadientu.dto.AppointmentCancellationResponse;
import websuachuadientu.entity.Appointment;
import websuachuadientu.service.AppointmentService;

import java.util.List;
import java.time.LocalDate;
import java.time.LocalTime;

@RestController
@RequestMapping("/api/appointments")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    @GetMapping
    public ResponseEntity<List<AssignedAppointmentResponse>> getAll(
            @RequestParam(required = false) LocalDate date,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String contactPhone) {
        return ResponseEntity.ok(appointmentService.getAll(date, status, contactPhone));
    }

    @GetMapping("/availability")
    public ResponseEntity<AppointmentAvailabilityResponse> checkAvailability(
            @RequestParam LocalDate date,
            @RequestParam LocalTime time) {
        return ResponseEntity.ok(appointmentService.checkAvailability(date, time));
    }

    @GetMapping("/pending")
    public ResponseEntity<List<AssignedAppointmentResponse>> getPending() {
        return ResponseEntity.ok(appointmentService.getPending());
    }

    @GetMapping("/me")
    public ResponseEntity<List<Appointment>> getMine(Authentication authentication) {
        return ResponseEntity.ok(appointmentService.getByCustomerEmail(authentication.getName()));
    }

    @GetMapping("/assigned/me")
    public ResponseEntity<List<AssignedAppointmentResponse>> getAssignedToMe(Authentication authentication) {
        return ResponseEntity.ok(appointmentService.getAssignedToEmployee(authentication.getName()));
    }

    @GetMapping("/assigned/me/groups")
    public ResponseEntity<AssignedAppointmentGroupsResponse> getAssignedAppointmentGroups(
            Authentication authentication) {
        return ResponseEntity.ok(appointmentService.getAssignedAppointmentGroups(authentication.getName()));
    }

    @PostMapping
    public ResponseEntity<Appointment> create(
            @Valid @RequestBody AppointmentRequest request,
            Authentication authentication) {
        boolean customerAccount = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_CUSTOMER".equals(authority.getAuthority()));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(appointmentService.create(request, authentication.getName(), customerAccount));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Appointment> updateMine(
            @PathVariable Long id,
            @Valid @RequestBody AppointmentRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(appointmentService.updateByCustomer(id, authentication.getName(), request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancelMine(
            @PathVariable Long id,
            Authentication authentication) {
        appointmentService.cancelByCustomer(id, authentication.getName());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/cancellation-request")
    public ResponseEntity<AppointmentCancellationResponse> requestCancellation(
            @PathVariable Long id,
            @Valid @RequestBody AppointmentCancellationReasonRequest request,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(appointmentService.requestCancellationByCustomer(
                id, authentication.getName(), request.reason()));
    }

    @GetMapping("/cancellation-requests")
    public ResponseEntity<List<AppointmentCancellationResponse>> getCancellationRequests(
            Authentication authentication) {
        boolean admin = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
        return ResponseEntity.ok(appointmentService.getCancellationRequests(authentication.getName(), admin));
    }

    @PatchMapping("/{id}/cancellation")
    public ResponseEntity<AppointmentCancellationResponse> reviewCancellation(
            @PathVariable Long id,
            @Valid @RequestBody AppointmentCancellationRequest request,
            Authentication authentication) {
        boolean admin = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
        return ResponseEntity.ok(appointmentService.reviewCancellation(
                id, request.decision(), authentication.getName(), admin));
    }

    @PatchMapping("/{id}/assign")
    public ResponseEntity<Appointment> assign(@PathVariable Long id, Authentication authentication) {
        boolean admin = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
        Appointment appointment = admin
                ? appointmentService.assignLeastBusyTechnician(id)
                : appointmentService.assignToEmployee(id, authentication.getName());
        return ResponseEntity.ok(appointment);
    }
}
