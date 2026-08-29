package com.sevacare.security;

public class OtpValidationResult {
    private final boolean valid;
    private final UserRole sessionRole;
    private final String userName;
    private final String message;
    private final boolean rateLimited;

    private OtpValidationResult(boolean valid, UserRole sessionRole, String userName, String message, boolean rateLimited) {
        this.valid = valid;
        this.sessionRole = sessionRole;
        this.userName = userName;
        this.message = message;
        this.rateLimited = rateLimited;
    }

    public static OtpValidationResult valid(UserRole role, String userName) {
        return new OtpValidationResult(true, role, userName, "OTP verification successful", false);
    }

    public static OtpValidationResult invalid(String message, boolean rateLimited) {
        return new OtpValidationResult(false, null, null, message, rateLimited);
    }

    public boolean isValid() { return valid; }
    public UserRole getRole() { return sessionRole; }
    public UserRole getSessionRole() { return sessionRole; }
    public String getUserName() { return userName; }
    public String getMessage() { return message; }
    public boolean isRateLimited() { return rateLimited; }
}
