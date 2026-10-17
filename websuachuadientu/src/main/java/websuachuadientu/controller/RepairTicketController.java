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
import websuachuadientu.dto.RepairHistoryResponse;
import websuachuadientu.service.RepairTicketService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/repair-tickets")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class RepairTicketController {
    private final RepairTicketService ticketService;

    @GetMapping
    public ResponseEntity<List<RepairTicketResponse>> search(
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(ticketService.search(keyword));
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
    public ResponseEntity<RepairTicketResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.getById(id));
    }

    @PostMapping
    public ResponseEntity<RepairTicketResponse> create(@Valid @RequestBody RepairTicketRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ticketService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RepairTicketResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody RepairTicketRequest request) {
        return ResponseEntity.ok(ticketService.update(id, request));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(IllegalArgumentException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", exception.getMessage()));
    }
}
