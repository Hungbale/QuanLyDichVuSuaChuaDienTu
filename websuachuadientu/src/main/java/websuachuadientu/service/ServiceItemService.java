package websuachuadientu.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import websuachuadientu.dto.ServiceItemRequest;
import websuachuadientu.entity.Category;
import websuachuadientu.entity.ServiceItem;
import websuachuadientu.repository.ServiceItemRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ServiceItemService {

    private final ServiceItemRepository serviceItemRepository;
    private final CategoryService categoryService;

    public List<ServiceItem> search(String keyword, String status, Long categoryId) {

        return serviceItemRepository.search(keyword, status, categoryId);
    }

    public ServiceItem getById(Long id) {

        return serviceItemRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Không tìm thấy dịch vụ"));
    }

    @Transactional
    public ServiceItem create(ServiceItemRequest request) {

        Category category = categoryService.getById(request.getCategoryId());

        if (!"ACTIVE".equals(category.getStatus())) {
            throw new RuntimeException("Danh mục không còn hoạt động");
        }

        ServiceItem serviceItem = new ServiceItem();
        serviceItem.setServiceCode(generateServiceCode());
        serviceItem.setName(request.getName().trim());
        serviceItem.setCategory(category);
        serviceItem.setPrice(request.getPrice());
        serviceItem.setDescription(
                request.getDescription() == null
                        ? null
                        : request.getDescription().trim()
        );
        serviceItem.setStatus("ACTIVE");

        return serviceItemRepository.save(serviceItem);
    }

    @Transactional
    public ServiceItem update(Long id, ServiceItemRequest request) {

        ServiceItem serviceItem = getById(id);
        Category category = categoryService.getById(request.getCategoryId());

        if (!"ACTIVE".equals(category.getStatus())
                && !category.getId().equals(serviceItem.getCategory().getId())) {
            throw new RuntimeException("Danh mục không còn hoạt động");
        }

        serviceItem.setName(request.getName().trim());
        serviceItem.setCategory(category);
        serviceItem.setPrice(request.getPrice());
        serviceItem.setDescription(
                request.getDescription() == null
                        ? null
                        : request.getDescription().trim()
        );

        return serviceItemRepository.save(serviceItem);
    }

    @Transactional
    public ServiceItem changeStatus(Long id) {

        ServiceItem serviceItem = getById(id);

        if ("ACTIVE".equals(serviceItem.getStatus())) {
            serviceItem.setStatus("INACTIVE");
        } else {
            serviceItem.setStatus("ACTIVE");
        }

        return serviceItemRepository.save(serviceItem);
    }

    @Transactional
    public void delete(Long id) {

        ServiceItem serviceItem = getById(id);
        serviceItemRepository.delete(serviceItem);
    }

    private String generateServiceCode() {

        return serviceItemRepository.findTopByOrderByIdDesc()
                .map(last -> {
                    String code = last.getServiceCode();
                    int number = 1;

                    if (code != null && code.matches("DV\\d+")) {
                        number = Integer.parseInt(code.substring(2)) + 1;
                    }

                    return String.format("DV%02d", number);
                })
                .orElse("DV01");
    }
}
