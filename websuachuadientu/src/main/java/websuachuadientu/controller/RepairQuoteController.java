package websuachuadientu.controller;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import websuachuadientu.dto.RepairQuoteDecisionRequest;
import websuachuadientu.dto.RepairQuoteRequest;
import websuachuadientu.dto.RepairQuoteResponse;
import websuachuadientu.service.RepairQuoteService;

import java.util.Map;

@RestController
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class RepairQuoteController {
    private final RepairQuoteService quoteService;

    @PostMapping("/api/repair-tickets/{ticketId}/quote")
    public ResponseEntity<RepairQuoteResponse> create(
            @PathVariable Long ticketId,
            @Valid @RequestBody RepairQuoteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(quoteService.create(ticketId, request));
    }

    @GetMapping("/api/repair-tickets/{ticketId}/quote")
    public ResponseEntity<RepairQuoteResponse> getByTicket(
            @PathVariable Long ticketId,
            Authentication authentication) {
        if (isCustomer(authentication)) {
            return ResponseEntity.ok(quoteService.getByTicketIdForCustomer(ticketId, authentication.getName()));
        }
        return ResponseEntity.ok(quoteService.getByTicketId(ticketId));
    }

    @PatchMapping("/api/quotes/{quoteId}/decision")
    public ResponseEntity<RepairQuoteResponse> decide(
            @PathVariable Long quoteId,
            @Valid @RequestBody RepairQuoteDecisionRequest request,
            Authentication authentication) {
        if (isCustomer(authentication)) {
            return ResponseEntity.ok(quoteService.decideForCustomer(
                    quoteId, request.decision(), authentication.getName()));
        }
        return ResponseEntity.ok(quoteService.decide(quoteId, request.decision()));
    }

    private boolean isCustomer(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_CUSTOMER".equals(authority.getAuthority()));
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
