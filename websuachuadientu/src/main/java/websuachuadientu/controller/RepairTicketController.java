package websuachuadientu.controller;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import websuachuadientu.dto.RepairTicketRequest;
import websuachuadientu.dto.RepairTicketResponse;
import websuachuadientu.dto.RepairTicketActivityResponse;
import websuachuadientu.dto.RepairHistoryResponse;
import websuachuadientu.service.RepairTicketService;
import websuachuadientu.service.RepairTrackingService;
import websuachuadientu.dto.RepairStatusUpdateResponse;
import websuachuadientu.dto.RepairTrackingResponse;
import websuachuadientu.dto.RepairIntakeRequest;
import websuachuadientu.dto.RepairIntakeResponse;
import websuachuadientu.service.RepairIntakeService;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/repair-tickets")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class RepairTicketController {
    private final RepairTicketService ticketService;
    private final RepairTrackingService trackingService;
    private final RepairIntakeService intakeService;

    @GetMapping
    public ResponseEntity<List<RepairTicketResponse>> search(
            @RequestParam(required = false) String keyword,
            Authentication authentication) {
        boolean admin = isAdmin(authentication);
        return ResponseEntity.ok(ticketService.search(keyword, authentication.getName(), admin));
    }

    @GetMapping("/history/me")
    public ResponseEntity<?> getMyRepairHistory(Authentication authentication) {
        if (authentication == null || authentication instanceof AnonymousAuthenticationToken) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Vui lòng đăng nhập để xem lịch sử sửa chữa"));
        }
        return ResponseEntity.ok(ticketService.getMyHistory(authentication.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RepairTicketResponse> getById(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(ticketService.getById(id, authentication.getName(), isAdmin(authentication)));
    }

    @PostMapping
    public ResponseEntity<RepairTicketResponse> create(@Valid @RequestBody RepairTicketRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ticketService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RepairTicketResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody RepairTicketRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(ticketService.update(id, request, authentication.getName(), isAdmin(authentication)));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<RepairTicketActivityResponse>> getHistory(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(ticketService.getHistory(
                id, authentication.getName(), isAdmin(authentication)));
    }

    @PostMapping("/{id}/intake")
    public ResponseEntity<RepairIntakeResponse> receiveDevice(
            @PathVariable Long id,
            @Valid @RequestBody RepairIntakeRequest request,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(intakeService.receive(
                id, request, authentication.getName(), isAdmin(authentication)));
    }

    @GetMapping("/{id}/intake")
    public ResponseEntity<RepairIntakeResponse> getIntake(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(intakeService.getByTicket(
                id, authentication.getName(), isAdmin(authentication)));
    }

    @PatchMapping(value = "/{id}/status", consumes = "multipart/form-data")
    public ResponseEntity<RepairStatusUpdateResponse> updateStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestParam(required = false) String note,
            @RequestParam("images") List<MultipartFile> images,
            Authentication authentication) {
        boolean admin = isAdmin(authentication);
        return ResponseEntity.ok(trackingService.updateStatus(
                id, status, note, images, authentication.getName(), admin));
    }

    @GetMapping("/{id}/tracking")
    public ResponseEntity<RepairTrackingResponse> getTracking(
            @PathVariable Long id, Authentication authentication) {
        boolean customer = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_CUSTOMER".equals(authority.getAuthority()));
        return ResponseEntity.ok(trackingService.getTracking(
                id, authentication.getName(), customer, isAdmin(authentication)));
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(IllegalArgumentException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", exception.getMessage()));
    }
}
