package com.sevacare.security;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class SendOtpRequest {

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[+]?[0-9]{10,15}$", message = "Must be a valid 10-15 digit mobile number")
    private String phone;

    private String roleSelected;
    private String name;
    private String language;

    public SendOtpRequest() {}

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getRoleSelected() { return roleSelected; }
    public void setRoleSelected(String roleSelected) { this.roleSelected = roleSelected; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
}
