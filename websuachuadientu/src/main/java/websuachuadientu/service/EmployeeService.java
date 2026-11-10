package websuachuadientu.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import websuachuadientu.dto.EmployeeRequest;
import websuachuadientu.dto.EmployeeProfileUpdateRequest;
import websuachuadientu.entity.Employee;
import websuachuadientu.entity.User;
import websuachuadientu.repository.EmployeeRepository;
import websuachuadientu.repository.UserRepository;
import websuachuadientu.repository.AppointmentRepository;
import websuachuadientu.repository.RepairTicketRepository;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final AppointmentRepository appointmentRepository;
    private final RepairTicketRepository repairTicketRepository;
    private final PasswordEncoder passwordEncoder;

    public List<Employee> getAll(String keyword) {

        if (keyword == null || keyword.trim().isEmpty()) {
            return employeeRepository.findAll();
        }

        return employeeRepository
                .findByFullNameContainingIgnoreCaseOrPhoneContaining(
                        keyword,
                        keyword
                );
    }

    public Employee getById(Long id) {

        return employeeRepository.findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhân viên"));
    }

    public Employee getByEmail(String email) {
        return employeeRepository.findByUser_Email(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ nhân viên"));
    }

    @Transactional
    public Employee updateMyProfile(String currentEmail, EmployeeProfileUpdateRequest request) {
        Employee employee = getByEmail(currentEmail);
        User user = employee.getUser();

        if (!user.getEmail().equalsIgnoreCase(request.getEmail())
                && userRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email đã tồn tại");
        }

        if (!employee.getPhone().equals(request.getPhone())
                && employeeRepository.existsByPhone(request.getPhone())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Số điện thoại đã tồn tại");
        }

        user.setEmail(request.getEmail());
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        employee.setFullName(request.getFullName());
        employee.setPhone(request.getPhone());

        return employeeRepository.save(employee);
    }

    @Transactional
    public Employee create(EmployeeRequest request) {

        if (employeeRepository.existsByEmployeeCode(request.getEmployeeCode())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Mã nhân viên đã tồn tại");
        }

        if (employeeRepository.existsByPhone(request.getPhone())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Số điện thoại đã tồn tại");
        }

        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu không được để trống");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email đã tồn tại");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole("EMPLOYEE");
        user = userRepository.save(user);

        Employee employee = new Employee();
        employee.setUser(user);
        employee.setEmployeeCode(request.getEmployeeCode());
        employee.setFullName(request.getFullName());
        employee.setPhone(request.getPhone());
        employee.setStatus("ACTIVE");

        return employeeRepository.save(employee);
    }

    @Transactional
    public Employee update(Long id, EmployeeRequest request) {

        Employee employee = getById(id);
        User user = employee.getUser();

        if (!user.getEmail().equalsIgnoreCase(request.getEmail())
                && userRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email đã tồn tại");
        }

        if (!employee.getPhone().equals(request.getPhone())
                && employeeRepository.existsByPhone(request.getPhone())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Số điện thoại đã tồn tại");
        }

        user.setEmail(request.getEmail());
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        employee.setFullName(request.getFullName());
        employee.setPhone(request.getPhone());

        return employeeRepository.save(employee);
    }

    @Transactional
    public Employee changeStatus(Long id, String status) {
        Employee employee = getById(id);
        if (!"ACTIVE".equals(status) && !"LOCKED".equals(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Employee status must be ACTIVE or LOCKED");
        }
        employee.setStatus(status);
        return employeeRepository.save(employee);
    }

    @Transactional
    public void delete(Long id) {

        Employee employee = getById(id);
        User user = employee.getUser();

        if (appointmentRepository.existsByTechnician_Id(id) || repairTicketRepository.existsByTechnician_Id(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot delete an employee assigned to an appointment or repair ticket; lock the account instead");
        }

        employeeRepository.delete(employee);
        userRepository.delete(user);
    }
}
