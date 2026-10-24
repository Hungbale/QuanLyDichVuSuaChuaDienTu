package websuachuadientu.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import websuachuadientu.dto.ServiceItemRequest;
import websuachuadientu.entity.Category;
import websuachuadientu.entity.ServiceItem;
import websuachuadientu.repository.ServiceItemRepository;
import websuachuadientu.repository.AppointmentRepository;
import websuachuadientu.repository.RepairTicketRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ServiceItemService {

    private final ServiceItemRepository serviceItemRepository;
    private final CategoryService categoryService;
    private final AppointmentRepository appointmentRepository;
    private final RepairTicketRepository repairTicketRepository;

    public List<ServiceItem> search(String keyword, String status, Long categoryId, boolean admin) {
        return serviceItemRepository.search(keyword, admin ? status : "ACTIVE", categoryId, admin);
    }

    public ServiceItem getById(Long id, boolean admin) {
        ServiceItem item = getById(id);
        if (!admin && (!"ACTIVE".equals(item.getStatus())
                || !"ACTIVE".equals(item.getCategory().getStatus()))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "KhĂ´ng tĂ¬m tháº¥y dá»‹ch vá»¥");
        }
        return item;
    }

    public ServiceItem getById(Long id) {

        return serviceItemRepository.findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy dịch vụ"));
    }

    @Transactional
    public ServiceItem create(ServiceItemRequest request) {

        Category category = categoryService.getById(request.getCategoryId());

        if (!"ACTIVE".equals(category.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Danh mục không còn hoạt động");
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
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Danh mục không còn hoạt động");
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
    public ServiceItem changeStatus(Long id, String status) {
        ServiceItem serviceItem = getById(id);
        if (!"ACTIVE".equals(status) && !"INACTIVE".equals(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Service status must be ACTIVE or INACTIVE");
        }
        if ("ACTIVE".equals(status) && !"ACTIVE".equals(serviceItem.getCategory().getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot activate a service in an inactive category");
        }
        serviceItem.setStatus(status);
        return serviceItemRepository.save(serviceItem);
    }

    @Transactional
    public void delete(Long id) {

        ServiceItem serviceItem = getById(id);
        if (appointmentRepository.existsByService_Id(id) || repairTicketRepository.existsByService_Id(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot delete a service used by an appointment or repair ticket; deactivate it instead");
        }
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
