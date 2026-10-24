package websuachuadientu.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import websuachuadientu.dto.CategoryRequest;
import websuachuadientu.entity.Category;
import websuachuadientu.repository.CategoryRepository;
import websuachuadientu.repository.ServiceItemRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ServiceItemRepository serviceItemRepository;

    public List<Category> getAll(String status, boolean admin) {
        if (!admin) return categoryRepository.findByStatus("ACTIVE");

        if (status == null || status.isBlank()) {
            return categoryRepository.findAll();
        }

        return categoryRepository.findByStatus(status);
    }

    public Category getById(Long id, boolean admin) {
        Category category = getById(id);
        if (!admin && !"ACTIVE".equals(category.getStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "KhĂ´ng tĂ¬m tháº¥y danh má»¥c");
        }
        return category;
    }

    public Category getById(Long id) {

        return categoryRepository.findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy danh mục"));
    }

    @Transactional
    public Category create(CategoryRequest request) {

        if (categoryRepository.existsByNameIgnoreCase(request.getName().trim())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tên danh mục đã tồn tại");
        }

        Category category = new Category();
        category.setName(request.getName().trim());
        category.setStatus("ACTIVE");

        return categoryRepository.save(category);
    }

    @Transactional
    public Category update(Long id, CategoryRequest request) {

        Category category = getById(id);
        String newName = request.getName().trim();

        if (!category.getName().equalsIgnoreCase(newName)
                && categoryRepository.existsByNameIgnoreCase(newName)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tên danh mục đã tồn tại");
        }

        category.setName(newName);

        return categoryRepository.save(category);
    }

    @Transactional
    public Category changeStatus(Long id, String status) {
        Category category = getById(id);
        if (!"ACTIVE".equals(status) && !"INACTIVE".equals(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category status must be ACTIVE or INACTIVE");
        }
        category.setStatus(status);
        return categoryRepository.save(category);
    }

    @Transactional
    public void delete(Long id) {

        Category category = getById(id);

        if (serviceItemRepository.existsByCategoryId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Không thể xóa danh mục đang được sử dụng bởi dịch vụ");
        }

        categoryRepository.delete(category);
    }
}
