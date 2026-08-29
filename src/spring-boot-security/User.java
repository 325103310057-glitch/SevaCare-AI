package com.sevacare.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public class User implements UserDetails {

    private String id;
    private String name;
    private String phone;
    private String email;
    private UserRole role;
    private UserStatus status;
    private Instant createdAt;
    private Instant lastLoginAt;

    public User() {}

    public User(String id, String name, String phone, String email, UserRole role, UserStatus status) {
        this.id = id;
        this.name = name;
        this.phone = phone;
        this.email = email;
        this.role = role;
        this.status = status != null ? status : UserStatus.ACTIVE;
        this.createdAt = Instant.now();
        this.lastLoginAt = Instant.now();
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String id;
        private String name;
        private String phone;
        private String email;
        private UserRole role = UserRole.PATIENT;
        private UserStatus status = UserStatus.ACTIVE;

        public Builder id(String id) { this.id = id; return this; }
        public Builder name(String name) { this.name = name; return this; }
        public Builder phone(String phone) { this.phone = phone; return this; }
        public Builder email(String email) { this.email = email; return this; }
        public Builder role(UserRole role) { this.role = role; return this; }
        public Builder status(UserStatus status) { this.status = status; return this; }

        public User build() {
            return new User(id, name, phone, email, role, status);
        }
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getPhone() { return phone; }
    public String getEmail() { return email; }
    public UserRole getRole() { return role; }
    public UserStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getLastLoginAt() { return lastLoginAt; }

    public void setLastLoginAt(Instant lastLoginAt) { this.lastLoginAt = lastLoginAt; }
    public void setRole(UserRole role) { this.role = role; }
    public void setName(String name) { this.name = name; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return ""; // Passwordless OTP authentication
    }

    @Override
    public String getUsername() {
        return phone;
    }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return status != UserStatus.SUSPENDED; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return status == UserStatus.ACTIVE; }
}
