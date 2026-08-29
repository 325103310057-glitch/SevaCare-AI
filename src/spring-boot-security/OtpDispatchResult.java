package com.sevacare.security;

import org.springframework.http.HttpStatus;

public class OtpDispatchResult {
    private final boolean success;
    private final String provider;
    private final HttpStatus httpStatus;
    private final String errorMessage;

    private OtpDispatchResult(boolean success, String provider, HttpStatus httpStatus, String errorMessage) {
        this.success = success;
        this.provider = provider;
        this.httpStatus = httpStatus;
        this.errorMessage = errorMessage;
    }

    public static OtpDispatchResult success(String provider) {
        return new OtpDispatchResult(true, provider, HttpStatus.OK, null);
    }

    public static OtpDispatchResult failure(HttpStatus status, String errorMessage) {
        return new OtpDispatchResult(false, null, status, errorMessage);
    }

    public boolean isSuccess() { return success; }
    public String getProvider() { return provider; }
    public HttpStatus getHttpStatus() { return httpStatus; }
    public String getErrorMessage() { return errorMessage; }
}
