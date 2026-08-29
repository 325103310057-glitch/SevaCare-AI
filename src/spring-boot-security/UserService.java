package com.sevacare.security;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class UserService {

    private final Map<String, User> userDatabase = new ConcurrentHashMap<>();

    public UserService() {
        // Seed initial demo users
        User patient = User.builder()
                .id("patient-demo-1")
                .name("Kalyani Amma")
                .phone("+919845122345")
                .email("patient@elderlycare.ai")
                .role(UserRole.PATIENT)
                .status(UserStatus.ACTIVE)
                .build();

        User caregiver = User.builder()
                .id("caregiver-demo-1")
                .name("Rahul Sharma")
                .phone("+919876543210")
                .email("caregiver@elderlycare.ai")
                .role(UserRole.CAREGIVER)
                .status(UserStatus.ACTIVE)
                .build();

        User admin = User.builder()
                .id("admin-demo-1")
                .name("Dr. Vikram Mehra")
                .phone("+919123456789")
                .email("admin@elderlycare.ai")
                .role(UserRole.ADMIN)
                .status(UserStatus.ACTIVE)
                .build();

        userDatabase.put(patient.getPhone(), patient);
        userDatabase.put(caregiver.getPhone(), caregiver);
        userDatabase.put(admin.getPhone(), admin);
    }

    public Optional<User> findByPhone(String phone) {
        if (phone == null) return Optional.empty();
        String clean = phone.replaceAll("[^0-9+]", "");
        return Optional.ofNullable(userDatabase.get(clean));
    }

    public User findOrCreateUserByPhone(String phone, UserRole role, String name) {
        String clean = phone.replaceAll("[^0-9+]", "");
        return userDatabase.computeIfAbsent(clean, p -> {
            String resolvedName = name != null && !name.isBlank() ? name : (role == UserRole.PATIENT ? "Senior Patient" : "Family Caregiver");
            return User.builder()
                    .id("usr-" + UUID.randomUUID().toString().substring(0, 8))
                    .name(resolvedName)
                    .phone(clean)
                    .email(resolvedName.toLowerCase().replaceAll("\\s+", "") + "@elderlycare.ai")
                    .role(role)
                    .status(UserStatus.ACTIVE)
                    .build();
        });
    }

    public void saveUser(User user) {
        userDatabase.put(user.getPhone(), user);
    }
}
