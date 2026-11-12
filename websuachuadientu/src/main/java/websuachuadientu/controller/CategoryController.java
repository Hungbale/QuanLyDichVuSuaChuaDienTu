package websuachuadientu.controller;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import websuachuadientu.dto.CategoryRequest;
import websuachuadientu.entity.Category;
import websuachuadientu.service.CategoryService;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public ResponseEntity<List<Category>> getAll(
            @RequestParam(required = false) String status) {

        return ResponseEntity.ok(
                categoryService.getAll(status)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<Category> getById(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                categoryService.getById(id)
        );
    }

    @PostMapping
    public ResponseEntity<Category> create(
            @Valid @RequestBody CategoryRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(categoryService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Category> update(
            @PathVariable Long id,
            @Valid @RequestBody CategoryRequest request) {

        return ResponseEntity.ok(
                categoryService.update(id, request)
        );
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Category> changeStatus(
            @PathVariable Long id) {

        return ResponseEntity.ok(
                categoryService.changeStatus(id)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id) {

        categoryService.delete(id);

        return ResponseEntity.noContent().build();
    }
}
