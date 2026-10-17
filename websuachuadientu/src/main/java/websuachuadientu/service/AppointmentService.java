package websuachuadientu.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import websuachuadientu.dto.AppointmentRequest;
import websuachuadientu.entity.Appointment;
import websuachuadientu.entity.ServiceItem;
import websuachuadientu.repository.AppointmentRepository;
import websuachuadientu.repository.ServiceItemRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final ServiceItemRepository serviceItemRepository;

    public List<Appointment> getAll() {
        return appointmentRepository.findAllByOrderByAppointmentDateAscAppointmentTimeAsc();
    }

    public List<Appointment> getByContactPhone(String contactPhone) {
        return appointmentRepository.findByContactPhoneOrderByAppointmentDateAscAppointmentTimeAsc(
                contactPhone.trim());
    }

    @Transactional
    public Appointment create(AppointmentRequest request) {
        ServiceItem service = serviceItemRepository.findById(request.getServiceId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy dịch vụ"));
        if (!"ACTIVE".equals(service.getStatus())) {
            throw new RuntimeException("Dịch vụ hiện không hoạt động");
        }
        if ("HOME_PICKUP".equals(request.getServiceMethod())
                && (request.getPickupAddress() == null || request.getPickupAddress().isBlank())) {
            throw new RuntimeException("Vui lòng nhập địa chỉ nhận máy");
        }

        Appointment appointment = new Appointment();
        appointment.setDevice(request.getDevice().trim());
        appointment.setService(service);
        appointment.setAppointmentDate(request.getAppointmentDate());
        appointment.setAppointmentTime(request.getAppointmentTime());
        appointment.setServiceMethod(request.getServiceMethod());
        appointment.setContactPhone(request.getContactPhone().trim());
        appointment.setProblemDescription(request.getProblemDescription().trim());
        appointment.setPickupAddress(request.getPickupAddress() == null
                ? null : request.getPickupAddress().trim());
        appointment.setStatus("PENDING");
        return appointmentRepository.save(appointment);
    }
}
