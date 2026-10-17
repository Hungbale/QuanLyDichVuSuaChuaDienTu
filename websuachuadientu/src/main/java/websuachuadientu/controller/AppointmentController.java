package websuachuadientu.controller;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import websuachuadientu.dto.AppointmentRequest;
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

    @PostMapping
    public ResponseEntity<Appointment> create(@Valid @RequestBody AppointmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(appointmentService.create(request));
    }
}
