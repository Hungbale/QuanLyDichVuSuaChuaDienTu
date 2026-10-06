package websuachuadientu.repository;

import websuachuadientu.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    @Query("""
        SELECT c FROM Customer c
        WHERE (:keyword IS NULL OR :keyword = ''
               OR LOWER(c.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR c.phone LIKE CONCAT('%', :keyword, '%')
               OR LOWER(c.user.email) LIKE LOWER(CONCAT('%', :keyword, '%')))
        AND (:status IS NULL OR :status = '' OR c.status = :status)
        """)
    List<Customer> search(
            @Param("keyword") String keyword,
            @Param("status") String status
    );

    boolean existsByCustomerCode(String customerCode);

    boolean existsByUser_Email(String email);

    boolean existsByPhone(String phone);

    Optional<Customer> findByUser_Email(String email);
}
