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
import websuachuadientu.entity.Appointment;
import websuachuadientu.service.AppointmentService;

import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    @GetMapping
    public ResponseEntity<List<Appointment>> getAll(
            @RequestParam(required = false) String contactPhone) {
        if (contactPhone != null && !contactPhone.isBlank()) {
            return ResponseEntity.ok(appointmentService.getByContactPhone(contactPhone));
        }
        return ResponseEntity.ok(appointmentService.getAll());
    }

    @GetMapping("/me")
    public ResponseEntity<List<Appointment>> getMine(Authentication authentication) {
        return ResponseEntity.ok(appointmentService.getByCustomerEmail(authentication.getName()));
    }

    @GetMapping("/assigned/me")
    public ResponseEntity<List<AssignedAppointmentResponse>> getAssignedToMe(Authentication authentication) {
        return ResponseEntity.ok(appointmentService.getAssignedToEmployee(authentication.getName()));
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

    @PatchMapping("/{id}/assign")
    public ResponseEntity<Appointment> assign(@PathVariable Long id) {
        return ResponseEntity.ok(appointmentService.assignLeastBusyTechnician(id));
    }
}
