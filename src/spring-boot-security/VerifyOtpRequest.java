package com.sevacare.security;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class VerifyOtpRequest {

    @NotBlank(message = "Phone number is required")
    private String phone;

    @NotBlank(message = "6-digit OTP code is required")
    @Pattern(regexp = "^[0-9]{6}$", message = "OTP must be exactly 6 digits")
    private String otp;

    private String expectedRole;

    public VerifyOtpRequest() {}

    public VerifyOtpRequest(String phone, String otp, String expectedRole) {
        this.phone = phone;
        this.otp = otp;
        this.expectedRole = expectedRole;
    }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }

    public String getExpectedRole() { return expectedRole; }
    public void setExpectedRole(String expectedRole) { this.expectedRole = expectedRole; }
}
