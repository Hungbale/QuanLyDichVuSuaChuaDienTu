package websuachuadientu.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import websuachuadientu.entity.Appointment;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.time.LocalDate;
import java.time.LocalTime;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findAllByOrderByAppointmentDateAscAppointmentTimeAsc();

    @Query("""
            select a from Appointment a
            where (:appointmentDate is null or a.appointmentDate = :appointmentDate)
              and (:status is null or upper(a.status) = upper(:status))
              and (:contactPhone is null or a.contactPhone like concat('%', :contactPhone, '%'))
            order by a.appointmentDate asc, a.appointmentTime asc
            """)
    List<Appointment> searchAppointments(@Param("appointmentDate") LocalDate appointmentDate,
                                         @Param("status") String status,
                                         @Param("contactPhone") String contactPhone);

    List<Appointment> findByStatusOrderByAppointmentDateAscAppointmentTimeAsc(String status);

    List<Appointment> findByContactPhoneOrderByAppointmentDateAscAppointmentTimeAsc(String contactPhone);

    List<Appointment> findByCustomer_User_EmailOrderByAppointmentDateAscAppointmentTimeAsc(String email);

    List<Appointment> findByTechnician_User_EmailOrderByAppointmentDateAscAppointmentTimeAsc(String email);

    Optional<Appointment> findByIdAndCustomer_User_Email(Long id, String email);

    long countByTechnician_IdAndStatusIn(Long technicianId, List<String> statuses);

    @Query("""
            select count(a) from Appointment a
            where a.technician.id = :technicianId
              and a.status in :statuses
              and not exists (select t.id from RepairTicket t where t.appointment = a)
            """)
    long countUnconvertedWorkByTechnician(@Param("technicianId") Long technicianId,
                                          @Param("statuses") List<String> statuses);

    boolean existsByTechnician_IdAndAppointmentDateAndAppointmentTimeAndStatusIn(
            Long technicianId, java.time.LocalDate appointmentDate,
            java.time.LocalTime appointmentTime, List<String> statuses);

    long countByAppointmentDateAndAppointmentTimeAndStatusIn(
            LocalDate appointmentDate, LocalTime appointmentTime, List<String> statuses);

    long countByAppointmentDateAndAppointmentTimeAndStatusInAndIdNot(
            LocalDate appointmentDate, LocalTime appointmentTime, List<String> statuses, Long excludedId);

    @Query("select a from Appointment a where a.id = :id and a.status = 'PENDING'")
    Optional<Appointment> findPendingById(@Param("id") Long id);

    boolean existsByTechnician_Id(Long technicianId);

    boolean existsByService_Id(Long serviceId);
}
