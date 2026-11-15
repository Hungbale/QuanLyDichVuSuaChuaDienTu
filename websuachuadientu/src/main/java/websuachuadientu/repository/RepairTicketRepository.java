package websuachuadientu.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import websuachuadientu.entity.RepairTicket;

import java.util.List;
import java.util.Optional;
import java.time.LocalDate;

public interface RepairTicketRepository extends JpaRepository<RepairTicket, Long> {
    long countByReceivedDateBetween(LocalDate fromDate, LocalDate toDate);

    @Query("""
            select count(t) from RepairTicket t
            where t.completedDate between :fromDate and :toDate
              and upper(t.status) = upper(:status)
            """)
    long countCompletedBetween(@Param("fromDate") LocalDate fromDate,
                               @Param("toDate") LocalDate toDate,
                               @Param("status") String status);

    @Query("""
            select upper(t.status) as status, count(t) as total
            from RepairTicket t
            where t.receivedDate between :fromDate and :toDate
            group by upper(t.status)
            """)
    List<ReportStatusCount> countStatusesReceivedBetween(@Param("fromDate") LocalDate fromDate,
                                                          @Param("toDate") LocalDate toDate);

    @Query("""
            SELECT t FROM RepairTicket t
            JOIN t.customer c
            WHERE :keyword IS NULL OR :keyword = ''
               OR LOWER(t.ticketCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(c.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(c.customerCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR c.phone LIKE CONCAT('%', :keyword, '%')
            ORDER BY t.receivedDate DESC, t.id DESC
            """)
    List<RepairTicket> search(@Param("keyword") String keyword);

    Optional<RepairTicket> findByTicketCode(String ticketCode);

    Optional<RepairTicket> findByTicketCodeIgnoreCase(String ticketCode);

    List<RepairTicket> findByCustomer_IdOrderByReceivedDateDescIdDesc(Long customerId);

    long countByTechnician_IdAndStatusNotIn(Long technicianId, List<String> terminalStatuses);

    boolean existsByAppointment_Id(Long appointmentId);

    Optional<RepairTicket> findByAppointment_Id(Long appointmentId);

    boolean existsByTechnician_Id(Long technicianId);

    boolean existsByService_Id(Long serviceId);
}
