package websuachuadientu.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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

    public List<Category> getAll(String status) {

        if (status == null || status.isBlank()) {
            return categoryRepository.findAll();
        }

        return categoryRepository.findByStatus(status);
    }

    public Category getById(Long id) {

        return categoryRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Không tìm thấy danh mục"));
    }

    @Transactional
    public Category create(CategoryRequest request) {

        if (categoryRepository.existsByNameIgnoreCase(request.getName().trim())) {
            throw new RuntimeException("Tên danh mục đã tồn tại");
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
            throw new RuntimeException("Tên danh mục đã tồn tại");
        }

        category.setName(newName);

        return categoryRepository.save(category);
    }

    @Transactional
    public Category changeStatus(Long id) {

        Category category = getById(id);

        if ("ACTIVE".equals(category.getStatus())) {
            category.setStatus("INACTIVE");
        } else {
            category.setStatus("ACTIVE");
        }

        return categoryRepository.save(category);
    }

    @Transactional
    public void delete(Long id) {

        Category category = getById(id);

        if (serviceItemRepository.existsByCategoryId(id)) {
            throw new RuntimeException(
                    "Không thể xóa danh mục đang được sử dụng bởi dịch vụ");
        }

        categoryRepository.delete(category);
    }
}
