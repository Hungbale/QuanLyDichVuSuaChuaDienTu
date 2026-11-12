package websuachuadientu.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import websuachuadientu.dto.CustomerRequest;
import websuachuadientu.entity.Customer;
import websuachuadientu.service.CustomerService;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping("/me")
    public ResponseEntity<Customer> getMyProfile(Authentication authentication) {
        return ResponseEntity.ok(customerService.getByEmail(authentication.getName()));
    }

    @PutMapping("/me")
    public ResponseEntity<Customer> updateMyProfile(
            Authentication authentication,
            @Valid @RequestBody CustomerRequest request) {
        return ResponseEntity.ok(customerService.updateByEmail(authentication.getName(), request));
    }

    @GetMapping
    public ResponseEntity<List<Customer>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status) {

        return ResponseEntity.ok(
                customerService.search(keyword, status)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<Customer> getById(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                customerService.getById(id)
        );
    }

    @PostMapping
    public ResponseEntity<Customer> create(
            @Valid @RequestBody CustomerRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(customerService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Customer> update(
            @PathVariable Long id,
            @Valid @RequestBody CustomerRequest request) {

        return ResponseEntity.ok(
                customerService.update(id, request)
        );
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Customer> changeStatus(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                customerService.changeStatus(id)
        );
    }
}
