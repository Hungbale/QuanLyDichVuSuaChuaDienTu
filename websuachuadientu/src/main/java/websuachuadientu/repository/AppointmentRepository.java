package websuachuadientu.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import websuachuadientu.entity.Appointment;

import java.util.List;
import java.util.Optional;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findAllByOrderByAppointmentDateAscAppointmentTimeAsc();

    List<Appointment> findByContactPhoneOrderByAppointmentDateAscAppointmentTimeAsc(String contactPhone);

    List<Appointment> findByCustomer_User_EmailOrderByAppointmentDateAscAppointmentTimeAsc(String email);

    Optional<Appointment> findByIdAndCustomer_User_Email(Long id, String email);
}
