package com.sevacare.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import jakarta.servlet.http.HttpServletResponse;
import java.util.List;

/**
 * Spring Security 6.x Configuration for SevaCare Elderly Care Platform.
 * Enforces stateless JWT authentication and role-based access control (RBAC).
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.jwtAuthenticationEntryPoint = jwtAuthenticationEntryPoint;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // 1. Disable CSRF as authentication is stateless and uses JWT tokens in headers
            .csrf(AbstractHttpConfigurer::disable)
            
            // 2. Enable CORS with strict origins
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            
            // 3. Exception handling for unauthorized / forbidden requests
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(jwtAuthenticationEntryPoint)
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setContentType("application/json");
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write("{\"error\": \"Access Denied: You do not have permission for this resource.\", \"status\": 403}");
                })
            )
            
            // 4. Stateless session management (No HTTP sessions stored on server)
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            
            // 5. URL Authorization Rules (Role-Based Access Control)
            .authorizeHttpRequests(auth -> auth
                // Public Authentication and Health Check Endpoints
                .requestMatchers(HttpMethod.POST, "/api/auth/send-otp").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/verify-otp").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/validate-token").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/health").permitAll()
                .requestMatchers("/api/public/**", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                
                // Senior Citizen / Patient Specific Routes
                .requestMatchers("/api/patient/**").hasAnyRole("PATIENT", "ADMIN")
                .requestMatchers("/api/voice/**").hasAnyRole("PATIENT", "ADMIN")
                
                // Caregiver Specific Routes
                .requestMatchers("/api/caregiver/**").hasAnyRole("CAREGIVER", "ADMIN")
                .requestMatchers("/api/schedules/**").hasAnyRole("CAREGIVER", "ADMIN")
                .requestMatchers("/api/alerts/**").hasAnyRole("CAREGIVER", "ADMIN")
                
                // Administrator Specific Routes
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                
                // Any other API request requires valid JWT token
                .anyRequest().authenticated()
            )
            
            // 6. Register JWT Authentication Filter before UsernamePasswordAuthenticationFilter
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With", "Accept"));
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
