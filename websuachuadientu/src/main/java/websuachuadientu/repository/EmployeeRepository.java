package websuachuadientu.repository;

import websuachuadientu.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    @Query("""
            SELECT e FROM Employee e
            WHERE LOWER(e.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR e.phone LIKE CONCAT('%', :keyword, '%')
               OR LOWER(e.employeeCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(e.user.email) LIKE LOWER(CONCAT('%', :keyword, '%'))
            """)
    List<Employee> searchByKeyword(@Param("keyword") String keyword);

    boolean existsByEmployeeCode(String employeeCode);

    boolean existsByPhone(String phone);

    java.util.Optional<Employee> findByUser_Email(String email);

    List<Employee> findByStatus(String status);
}
