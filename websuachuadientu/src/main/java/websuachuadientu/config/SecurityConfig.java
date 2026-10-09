package websuachuadientu.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import websuachuadientu.security.JwtAuthenticationFilter;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
                .csrf(csrf -> csrf.disable())

                .cors(Customizer.withDefaults())

                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth
                        // Cho phép request OPTIONS của trình duyệt
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // API đăng ký và đăng nhập không cần JWT
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/auth/register",
                                "/api/auth/login"
                        ).permitAll()

                        // Tạm thời cho phép tất cả API
                        .requestMatchers(
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**"
                        ).permitAll()

                        // Admin có toàn quyền trên các API.
                        .requestMatchers(HttpMethod.POST, "/api/auth/logout")
                        .hasAnyRole("CUSTOMER", "EMPLOYEE", "ADMIN")

                        // Customer: xem catalog, đặt lịch, hồ sơ và nghiệp vụ của chính mình.
                        .requestMatchers(HttpMethod.GET, "/api/categories/**", "/api/services/**")
                        .hasAnyRole("ADMIN", "CUSTOMER", "EMPLOYEE")
                        .requestMatchers(HttpMethod.POST, "/api/appointments")
                        .hasAnyRole("ADMIN", "CUSTOMER", "EMPLOYEE")
                        .requestMatchers(HttpMethod.GET, "/api/repair-tickets/history/me")
                        .hasAnyRole("ADMIN", "CUSTOMER")
                        .requestMatchers(HttpMethod.GET, "/api/customers/me")
                        .hasAnyRole("ADMIN", "CUSTOMER")
                        .requestMatchers(HttpMethod.PUT, "/api/customers/me")
                        .hasAnyRole("ADMIN", "CUSTOMER")
                        .requestMatchers(HttpMethod.GET, "/api/repair-tickets/*/quote")
                        .hasAnyRole("ADMIN", "CUSTOMER", "EMPLOYEE")
                        .requestMatchers(HttpMethod.PATCH, "/api/quotes/*/decision")
                        .hasAnyRole("ADMIN", "CUSTOMER", "EMPLOYEE")
                        .requestMatchers(HttpMethod.POST, "/api/repair-tickets/*/payments")
                        .hasAnyRole("ADMIN", "CUSTOMER", "EMPLOYEE")
                        .requestMatchers(HttpMethod.GET, "/api/repair-tickets/*/payments")
                        .hasAnyRole("ADMIN", "CUSTOMER", "EMPLOYEE")

                        // Employee: xử lý nghiệp vụ nội bộ và tra cứu khách hàng.
                        .requestMatchers("/api/repair-tickets/**", "/api/quotes/**", "/api/payments/**")
                        .hasAnyRole("ADMIN", "EMPLOYEE")
                        .requestMatchers(HttpMethod.GET, "/api/appointments")
                        .hasAnyRole("ADMIN", "EMPLOYEE")
                        .requestMatchers(HttpMethod.GET, "/api/customers", "/api/customers/*")
                        .hasAnyRole("ADMIN", "EMPLOYEE")
                        .requestMatchers(HttpMethod.POST, "/api/customers")
                        .hasAnyRole("ADMIN", "EMPLOYEE")

                        .requestMatchers("/api/**").hasRole("ADMIN")

                        // Mặc định từ chối endpoint chưa được gán quyền.
                        .anyRequest().denyAll()
                )

                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration = new CorsConfiguration();

        // FE React
        configuration.setAllowedOrigins(
                List.of(
                        "http://localhost:5173",
                        "http://localhost:8080"
                )
        );

        // Các method FE được phép gọi
        configuration.setAllowedMethods(List.of(
                "GET",
                "POST",
                "PUT",
                "PATCH",
                "DELETE",
                "OPTIONS"
        ));

        // Cho phép các header, ví dụ Authorization, Content-Type...
        configuration.setAllowedHeaders(List.of("*"));

        // Cho phép gửi cookie nếu sau này cần
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}
