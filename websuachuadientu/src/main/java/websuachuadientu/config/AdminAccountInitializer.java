package websuachuadientu.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;
import websuachuadientu.entity.User;
import websuachuadientu.repository.UserRepository;

@Configuration
public class AdminAccountInitializer {

    @Bean
    CommandLineRunner initializeAdminAccount(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.admin.email:admin@repair.local}") String adminEmail,
            @Value("${app.admin.password:}") String adminPassword) {
        return args -> {
            if (!StringUtils.hasText(adminPassword)) {
                return;
            }

            if (userRepository.existsByEmail(adminEmail)) {
                return;
            }

            User admin = new User();
            admin.setEmail(adminEmail);
            admin.setPassword(passwordEncoder.encode(adminPassword));
            admin.setRole("ADMIN");
            userRepository.save(admin);
        };
    }
}
