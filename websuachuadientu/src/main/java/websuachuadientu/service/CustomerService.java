package websuachuadientu.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import websuachuadientu.dto.CustomerRequest;
import websuachuadientu.entity.Customer;
import websuachuadientu.entity.User;
import websuachuadientu.repository.CustomerRepository;
import websuachuadientu.repository.UserRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public List<Customer> search(String keyword, String status) {

        return customerRepository.search(keyword, status);
    }

    public Customer getById(Long id) {

        return customerRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Không tìm thấy khách hàng"));
    }

    public Customer getByEmail(String email) {
        return customerRepository.findByUser_Email(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy hồ sơ khách hàng"));
    }

    @Transactional
    public Customer create(CustomerRequest request) {

        if (customerRepository.existsByCustomerCode(
                request.getCustomerCode())) {
            throw new RuntimeException("Mã khách hàng đã tồn tại");
        }

        if (userRepository.existsByEmail(request.getEmail())
                || customerRepository.existsByUser_Email(request.getEmail())) {
            throw new RuntimeException("Email đã tồn tại");
        }

        if (customerRepository.existsByPhone(request.getPhone())) {
            throw new RuntimeException("Số điện thoại đã tồn tại");
        }

        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new RuntimeException("Mật khẩu không được để trống");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole("CUSTOMER");
        user = userRepository.save(user);

        Customer customer = new Customer();
        customer.setUser(user);
        customer.setCustomerCode(request.getCustomerCode());
        customer.setFullName(request.getFullName());
        customer.setPhone(request.getPhone());
        customer.setAddress(request.getAddress());
        customer.setRepairCount(0);
        customer.setStatus("ACTIVE");

        return customerRepository.save(customer);
    }

    @Transactional
    public Customer update(Long id, CustomerRequest request) {

        Customer customer = getById(id);
        User user = customer.getUser();

        if (!user.getEmail().equalsIgnoreCase(request.getEmail())
                && userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email đã tồn tại");
        }

        if (!customer.getPhone().equals(request.getPhone())
                && customerRepository.existsByPhone(request.getPhone())) {
            throw new RuntimeException("Số điện thoại đã tồn tại");
        }

        user.setEmail(request.getEmail());
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        customer.setFullName(request.getFullName());
        customer.setPhone(request.getPhone());
        customer.setAddress(request.getAddress());

        return customerRepository.save(customer);
    }

    @Transactional
    public Customer updateByEmail(String email, CustomerRequest request) {
        return update(getByEmail(email).getId(), request);
    }

    public Customer changeStatus(Long id) {

        Customer customer = getById(id);

        if ("ACTIVE".equals(customer.getStatus())) {
            customer.setStatus("LOCKED");
        } else {
            customer.setStatus("ACTIVE");
        }

        return customerRepository.save(customer);
    }
}
