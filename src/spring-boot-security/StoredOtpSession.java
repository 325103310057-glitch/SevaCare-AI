package com.sevacare.security;

import java.util.List;

public class StoredOtpSession {
    private final String phone;
    private final String otpCode;
    private final UserRole role;
    private final String userName;
    private final long expiresAt;
    private int attempts;
    private final List<Long> requestTimestamps;

    public StoredOtpSession(
            String phone,
            String otpCode,
            UserRole role,
            String userName,
            long expiresAt,
            int attempts,
            List<Long> requestTimestamps) {
        this.phone = phone;
        this.otpCode = otpCode;
        this.role = role;
        this.userName = userName;
        this.expiresAt = expiresAt;
        this.attempts = attempts;
        this.requestTimestamps = requestTimestamps;
    }

    public String getPhone() { return phone; }
    public String getOtpCode() { return otpCode; }
    public UserRole getRole() { return role; }
    public String getUserName() { return userName; }
    public long getExpiresAt() { return expiresAt; }
    public int getAttempts() { return attempts; }
    public List<Long> getRequestTimestamps() { return requestTimestamps; }

    public int incrementAttempts() {
        this.attempts++;
        return this.attempts;
    }
}
