package websuachuadientu.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import websuachuadientu.entity.RepairTicket;

import java.util.List;

public interface RepairTicketRepository extends JpaRepository<RepairTicket, Long> {
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

    List<RepairTicket> findByCustomer_IdOrderByReceivedDateDescIdDesc(Long customerId);
}
