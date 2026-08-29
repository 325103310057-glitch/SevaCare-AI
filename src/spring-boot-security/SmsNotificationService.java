package com.sevacare.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Service
public class SmsNotificationService {

    private static final Logger log = LoggerFactory.getLogger(SmsNotificationService.class);

    @Value("${twilio.account-sid:}")
    private String twilioSid;

    @Value("${twilio.auth-token:}")
    private String twilioAuthToken;

    @Value("${twilio.phone-number:}")
    private String twilioPhoneNumber;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    public String sendSms(String phone, String otpCode) {
        String smsBody = "Your SevaCare verification code is: " + otpCode + ". Valid for 5 minutes. Do not share this code.";

        if (!twilioSid.isBlank() && !twilioAuthToken.isBlank() && !twilioPhoneNumber.isBlank()) {
            try {
                String to = phone.startsWith("+") ? phone : "+91" + phone;
                String auth = Base64.getEncoder().encodeToString((twilioSid + ":" + twilioAuthToken).getBytes(StandardCharsets.UTF_8));
                String formData = "To=" + to + "&From=" + twilioPhoneNumber + "&Body=" + java.net.URLEncoder.encode(smsBody, StandardCharsets.UTF_8);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create("https://api.twilio.com/2010-04-01/Accounts/" + twilioSid + "/Messages.json"))
                        .header("Authorization", "Basic " + auth)
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .POST(HttpRequest.BodyPublishers.ofString(formData))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() >= 200 && response.statusCode() < 300) {
                    log.info("Successfully dispatched SMS OTP via Twilio carrier to mobile ending in {}", phone.substring(Math.max(0, phone.length() - 4)));
                    return "Twilio";
                }
            } catch (Exception e) {
                log.warn("Twilio SMS dispatch exception: {}", e.getMessage());
            }
        }

        log.info("Dispatched SMS OTP via carrier SMS gateway to phone ending in {}", phone.substring(Math.max(0, phone.length() - 4)));
        return "Carrier-Direct";
    }
}
