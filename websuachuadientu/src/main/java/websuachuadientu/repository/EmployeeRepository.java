package websuachuadientu.repository;

import websuachuadientu.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    List<Employee> findByFullNameContainingIgnoreCaseOrPhoneContaining(
            String fullName,
            String phone
    );

    boolean existsByEmployeeCode(String employeeCode);

    boolean existsByPhone(String phone);

    java.util.Optional<Employee> findByUser_Email(String email);

    List<Employee> findByStatus(String status);
}
