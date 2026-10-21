package websuachuadientu.controller;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import websuachuadientu.dto.RepairPaymentRequest;
import websuachuadientu.dto.RepairPaymentResponse;
import websuachuadientu.service.RepairPaymentService;

import java.util.List;
import java.util.Map;

@RestController
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class RepairPaymentController {
    private final RepairPaymentService paymentService;

    @PostMapping("/api/repair-tickets/{ticketId}/payments")
    public ResponseEntity<RepairPaymentResponse> initiate(
            @PathVariable Long ticketId,
            @Valid @RequestBody RepairPaymentRequest request,
            Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                paymentService.initiateForCustomer(ticketId, request, authentication.getName()));
    }

    @GetMapping("/api/repair-tickets/{ticketId}/payments")
    public ResponseEntity<List<RepairPaymentResponse>> history(
            @PathVariable Long ticketId,
            Authentication authentication) {
        if (isCustomer(authentication)) {
            return ResponseEntity.ok(paymentService.historyForCustomer(ticketId, authentication.getName()));
        }
        if (!isAdmin(authentication)) {
            return ResponseEntity.ok(paymentService.historyForEmployee(ticketId, authentication.getName()));
        }
        return ResponseEntity.ok(paymentService.history(ticketId));
    }

    private boolean isCustomer(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_CUSTOMER".equals(authority.getAuthority()));
    }

    // This endpoint is for a payment-provider callback or staff confirmation after funds are received.
    @PatchMapping("/api/payments/{paymentId}/confirm")
    public ResponseEntity<RepairPaymentResponse> confirmReceived(
            @PathVariable Long paymentId, Authentication authentication) {
        return ResponseEntity.ok(paymentService.confirmReceived(
                paymentId, authentication.getName(), isAdmin(authentication)));
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(IllegalArgumentException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", exception.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleConflict(IllegalStateException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", exception.getMessage()));
    }
}
