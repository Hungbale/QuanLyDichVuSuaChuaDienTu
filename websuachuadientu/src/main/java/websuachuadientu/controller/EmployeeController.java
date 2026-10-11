package websuachuadientu.controller;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import websuachuadientu.dto.EmployeeRequest;
import websuachuadientu.entity.Employee;
import websuachuadientu.service.EmployeeService;

import java.util.List;

@RestController
@RequestMapping("/api/employees")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService employeeService;

    @GetMapping
    public ResponseEntity<List<Employee>> getAll(
            @RequestParam(required = false) String keyword) {

        return ResponseEntity.ok(
                employeeService.getAll(keyword)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<Employee> getById(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                employeeService.getById(id)
        );
    }

    @PostMapping
    public ResponseEntity<Employee> create(
            @Valid @RequestBody EmployeeRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(employeeService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Employee> update(
            @PathVariable Long id,
            @Valid @RequestBody EmployeeRequest request) {

        return ResponseEntity.ok(
                employeeService.update(id, request)
        );
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Employee> changeStatus(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                employeeService.changeStatus(id)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id) {

        employeeService.delete(id);

        return ResponseEntity.noContent().build();
    }
}
