package com.sevacare.security;

import java.util.List;

public class AuthResponse {
    private boolean success;
    private boolean verified;
    private String token;
    private String tokenType;
    private long expiresIn;
    private String role;
    private List<String> authorities;
    private UserDto user;
    private String message;

    public AuthResponse() {}

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private boolean success = true;
        private boolean verified = true;
        private String token;
        private String tokenType = "Bearer";
        private long expiresIn = 86400;
        private String role;
        private List<String> authorities;
        private UserDto user;
        private String message;

        public Builder success(boolean success) { this.success = success; return this; }
        public Builder verified(boolean verified) { this.verified = verified; return this; }
        public Builder token(String token) { this.token = token; return this; }
        public Builder tokenType(String tokenType) { this.tokenType = tokenType; return this; }
        public Builder expiresIn(long expiresIn) { this.expiresIn = expiresIn; return this; }
        public Builder role(String role) { this.role = role; return this; }
        public Builder authorities(List<String> authorities) { this.authorities = authorities; return this; }
        public Builder user(UserDto user) { this.user = user; return this; }
        public Builder message(String message) { this.message = message; return this; }

        public AuthResponse build() {
            AuthResponse res = new AuthResponse();
            res.success = this.success;
            res.verified = this.verified;
            res.token = this.token;
            res.tokenType = this.tokenType;
            res.expiresIn = this.expiresIn;
            res.role = this.role;
            res.authorities = this.authorities;
            res.user = this.user;
            res.message = this.message;
            return res;
        }
    }

    public boolean isSuccess() { return success; }
    public boolean isVerified() { return verified; }
    public String getToken() { return token; }
    public String getTokenType() { return tokenType; }
    public long getExpiresIn() { return expiresIn; }
    public String getRole() { return role; }
    public List<String> getAuthorities() { return authorities; }
    public UserDto getUser() { return user; }
    public String getMessage() { return message; }
}
