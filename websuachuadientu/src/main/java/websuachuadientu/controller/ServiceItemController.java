package websuachuadientu.controller;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import websuachuadientu.dto.ServiceItemRequest;
import websuachuadientu.dto.StatusRequest;
import websuachuadientu.entity.ServiceItem;
import websuachuadientu.service.ServiceItemService;

import java.util.List;

@RestController
@RequestMapping("/api/services")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class ServiceItemController {

    private final ServiceItemService serviceItemService;

    @GetMapping
    public ResponseEntity<List<ServiceItem>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long categoryId,
            Authentication authentication) {

        return ResponseEntity.ok(
                serviceItemService.search(keyword, status, categoryId, isAdmin(authentication))
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServiceItem> getById(
            @PathVariable Long id, Authentication authentication) {

        return ResponseEntity.ok(
                serviceItemService.getById(id, isAdmin(authentication))
        );
    }

    @PostMapping
    public ResponseEntity<ServiceItem> create(
            @Valid @RequestBody ServiceItemRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(serviceItemService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ServiceItem> update(
            @PathVariable Long id,
            @Valid @RequestBody ServiceItemRequest request) {

        return ResponseEntity.ok(
                serviceItemService.update(id, request)
        );
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ServiceItem> changeStatus(
            @PathVariable Long id,
            @Valid @RequestBody StatusRequest request) {

        return ResponseEntity.ok(
                serviceItemService.changeStatus(id, request.status())
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id) {

        serviceItemService.delete(id);

        return ResponseEntity.noContent().build();
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }
}
