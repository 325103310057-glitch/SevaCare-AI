# SevaCare Spring Boot 3.x / Spring Security 6.x Security Architecture

This module contains the enterprise Spring Boot security configuration, OTP verification service, and JWT issuance system for SevaCare.

## Maven Dependencies (`pom.xml`)

```xml
<dependencies>
    <!-- Spring Boot Starters -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>

    <!-- JJWT for JWT Token Generation & Verification -->
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.12.5</version>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-impl</artifactId>
        <version>0.12.5</version>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-jackson</artifactId>
        <version>0.12.5</version>
        <scope>runtime</scope>
    </dependency>
</dependencies>
```

## Security Workflow & Endpoints

### 1. Request SMS OTP (`POST /api/auth/send-otp`)
- **Request Body:** `{ "phone": "+91 98451 22345", "roleSelected": "PATIENT", "name": "Kalyani Amma" }`
- Enforces rate limiting: Max 3 requests per 10-minute window, with 30-second anti-spam delay.
- Generates a cryptographic 6-digit numeric OTP with 5-minute TTL.
- Dispatches SMS via Twilio / SMS Gateway.

### 2. Verify OTP & Issue JWT (`POST /api/auth/verify-otp`)
- **Request Body:** `{ "phone": "+91 98451 22345", "otp": "123456", "expectedRole": "PATIENT" }`
- **Validation:**
  1. Validates OTP against stored backend session.
  2. Verifies single-use policy and attempt counter (max 5 attempts).
  3. Verifies user role authorization (`ROLE_PATIENT`, `ROLE_CAREGIVER`, `ROLE_ADMIN`).
  4. Checks user status (rejects `SUSPENDED` accounts).
  5. Invalidates OTP session immediately from storage upon success.
  6. Generates and signs a JWT token with claims (`sub`, `phone`, `role`, `authorities`, `name`, `iss`, `exp`).
- **Response:**
```json
{
  "success": true,
  "verified": true,
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "role": "PATIENT",
  "authorities": ["ROLE_PATIENT"],
  "user": {
    "id": "usr-12345",
    "name": "Kalyani Amma",
    "phone": "+919845122345",
    "email": "kalyaniamma@elderlycare.ai",
    "role": "PATIENT",
    "status": "ACTIVE"
  },
  "message": "OTP verified successfully. Authenticated JWT token issued."
}
```

### 3. Role-Based Access Control (RBAC) in `SecurityConfig.java`
- `/api/patient/**` & `/api/voice/**` $\rightarrow$ Authorized for `ROLE_PATIENT`, `ROLE_ADMIN`
- `/api/caregiver/**`, `/api/schedules/**`, `/api/alerts/**` $\rightarrow$ Authorized for `ROLE_CAREGIVER`, `ROLE_ADMIN`
- `/api/admin/**` $\rightarrow$ Restricted strictly to `ROLE_ADMIN`
- Authenticated via `JwtAuthenticationFilter` with `Authorization: Bearer <token>`
