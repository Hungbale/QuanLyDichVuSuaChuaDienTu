package websuachuadientu.controller;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import websuachuadientu.dto.ServiceItemRequest;
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
            @RequestParam(required = false) Long categoryId) {

        return ResponseEntity.ok(
                serviceItemService.search(keyword, status, categoryId)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServiceItem> getById(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                serviceItemService.getById(id)
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
            @PathVariable Long id) {

        return ResponseEntity.ok(
                serviceItemService.changeStatus(id)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id) {

        serviceItemService.delete(id);

        return ResponseEntity.noContent().build();
    }
}
