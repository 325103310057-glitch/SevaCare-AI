package com.sevacare.security;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

/**
 * Spring Boot REST Controller handling OTP Authentication and JWT Issuance.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final OtpService otpService;
    private final UserService userService;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthController(
            OtpService otpService,
            UserService userService,
            JwtTokenProvider jwtTokenProvider) {
        this.otpService = otpService;
        this.userService = userService;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    /**
     * Request a 6-digit numeric SMS OTP.
     * Enforces rate limiting (max 3 per 10 mins) and dispatches real SMS.
     */
    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@Valid @RequestBody SendOtpRequest request) {
        String cleanPhone = sanitizePhone(request.getPhone());
        
        OtpDispatchResult dispatchResult = otpService.generateAndSendOtp(
                cleanPhone,
                request.getRoleSelected(),
                request.getName()
        );

        if (!dispatchResult.isSuccess()) {
            return ResponseEntity.status(dispatchResult.getHttpStatus())
                    .body(new ApiResponse(false, dispatchResult.getErrorMessage()));
        }

        String maskedPhone = maskPhoneNumber(cleanPhone);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "A 6-digit verification OTP has been sent via SMS to your mobile phone (" + maskedPhone + ").",
                "maskedPhone", maskedPhone,
                "expiresInSeconds", 300,
                "smsProvider", dispatchResult.getProvider()
        ));
    }

    /**
     * POST /api/auth/verify-otp
     * 1. Validates the incoming OTP against the backend-stored session or database.
     * 2. Checks attempt count (max 5) and TTL expiration (5 mins).
     * 3. Verifies the user's role authorization.
     * 4. Upon success, invalidates the OTP and issues a signed JWT token with the verified role.
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        String cleanPhone = sanitizePhone(request.getPhone());
        String cleanOtp = request.getOtp() != null ? request.getOtp().trim() : "";

        // 1. Validate incoming OTP against backend session/database store
        OtpValidationResult validationResult = otpService.validateAndConsumeOtp(cleanPhone, cleanOtp);

        if (!validationResult.isValid()) {
            HttpStatus status = validationResult.isRateLimited() 
                    ? HttpStatus.TOO_MANY_REQUESTS 
                    : HttpStatus.UNAUTHORIZED;
            return ResponseEntity.status(status).body(new ApiResponse(false, validationResult.getMessage()));
        }

        // 2. Verify User & Role from Database or Session Context
        UserRole targetRole = determineUserRole(request.getExpectedRole(), validationResult.getSessionRole());
        
        User user = userService.findOrCreateUserByPhone(cleanPhone, targetRole, validationResult.getUserName());

        // Check if user account is active
        if (user.getStatus() == UserStatus.SUSPENDED) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ApiResponse(false, "This user account has been suspended by the administrator."));
        }

        // 3. Issue signed JWT token representing the authorized role
        String jwtToken = jwtTokenProvider.generateToken(user);
        long expiresIn = jwtTokenProvider.getExpirationInSeconds();

        // 4. Return secure authentication response
        return ResponseEntity.ok(AuthResponse.builder()
                .success(true)
                .verified(true)
                .token(jwtToken)
                .tokenType("Bearer")
                .expiresIn(expiresIn)
                .role(user.getRole().name())
                .authorities(List.of("ROLE_" + user.getRole().name()))
                .user(UserDto.from(user))
                .message("OTP verified successfully. Authenticated JWT token issued.")
                .build());
    }

    /**
     * Retrieve authenticated user details from the JWT security context.
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse(false, "No authenticated session found."));
        }
        User user = userService.findByPhone(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(Map.of(
                "authenticated", true,
                "user", UserDto.from(user),
                "authorities", userDetails.getAuthorities()
        ));
    }

    /**
     * Validate an existing JWT token.
     */
    @PostMapping("/validate-token")
    public ResponseEntity<?> validateToken(@RequestBody Map<String, String> payload) {
        String token = payload.get("token");
        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("valid", false, "error", "Token is required"));
        }
        boolean isValid = jwtTokenProvider.validateToken(token);
        if (isValid) {
            return ResponseEntity.ok(Map.of(
                    "valid", true,
                    "phone", jwtTokenProvider.getPhoneFromToken(token),
                    "role", jwtTokenProvider.getRoleFromToken(token)
            ));
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("valid", false, "error", "Token is invalid or expired"));
        }
    }

    private UserRole determineUserRole(String expectedRoleStr, UserRole sessionRole) {
        if (expectedRoleStr != null && !expectedRoleStr.isBlank()) {
            try {
                return UserRole.valueOf(expectedRoleStr.toUpperCase().replace("ROLE_", ""));
            } catch (IllegalArgumentException ignored) {}
        }
        return sessionRole != null ? sessionRole : UserRole.PATIENT;
    }

    private String sanitizePhone(String phone) {
        if (phone == null) return "";
        return phone.replaceAll("[^0-9+]", "").trim();
    }

    private String maskPhoneNumber(String phone) {
        if (phone == null || phone.length() < 4) return "+91 ••••• •••••";
        String lastFour = phone.substring(phone.length() - 4);
        return "+91 ••••• •" + lastFour;
    }
}
