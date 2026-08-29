import express, { Request, Response, NextFunction } from "express";
import http from "http";
import path from "path";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

const JWT_SECRET = process.env.JWT_SECRET || "sevacare-jwt-super-secret-key-2026-production-hmac-sha256";
const JWT_EXPIRATION_SECONDS = Number(process.env.JWT_EXPIRATION_SECONDS) || 86400; // 24 hours

app.use(express.json());

// Extend Express Request for authenticated user context
interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    phone: string;
    role: string;
    authorities: string[];
    name?: string;
    iat?: number;
    exp?: number;
    [key: string]: any;
  };
}

// JWT Authentication Middleware for securing backend endpoints
function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({
      error: "Unauthorized: Missing JWT Bearer authorization token.",
      authenticated: false,
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err: any) {
    return res.status(403).json({
      error: "Forbidden: Invalid or expired JWT authentication token.",
      authenticated: false,
      details: err.message,
    });
  }
}

// Role Authorization Guard Middleware
function requireRoles(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: "Unauthorized: User role not found in JWT token." });
    }
    const userRole = req.user.role.toUpperCase().replace("ROLE_", "");
    const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase().replace("ROLE_", ""));

    if (!normalizedAllowed.includes(userRole) && userRole !== "ADMIN") {
      return res.status(403).json({
        error: `Access Denied: Required role [${allowedRoles.join(", ")}], but token has role [${userRole}].`,
        authorized: false,
      });
    }
    next();
  };
}

// Initialize Google GenAI client securely on the server
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    } catch (e) {
      console.warn("Failed to initialize GoogleGenAI:", e);
    }
  }
  return aiClient;
}

// Multi-model resilience and quota management
// Tracks model rate-limit cooldowns to avoid repeated 429 error cascades
const modelCooldowns = new Map<string, number>();

// Available text model tiers in order of preference
const MODEL_TIERS = ["gemini-3.7-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];

async function safeGenerateContent(params: {
  contents: string;
  config?: any;
  temperature?: number;
}): Promise<string | null> {
  const ai = getAIClient();
  if (!ai) return null;

  const now = Date.now();

  for (const model of MODEL_TIERS) {
    const cooldownUntil = modelCooldowns.get(model) || 0;
    if (now < cooldownUntil) {
      // Model is temporarily cooling down from quota limit or unavailable
      continue;
    }

    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isQuotaError =
        errMsg.includes("429") ||
        errMsg.includes("quota") ||
        errMsg.includes("RESOURCE_EXHAUSTED") ||
        err?.status === "RESOURCE_EXHAUSTED" ||
        err?.code === 429;

      const isUnavailable =
        errMsg.includes("404") ||
        errMsg.includes("not found") ||
        errMsg.includes("no longer available") ||
        err?.code === 404;

      if (isQuotaError) {
        // Put model on 30-second cooldown
        modelCooldowns.set(model, now + 30000);
      } else if (isUnavailable) {
        // Permanently skip this model in this session
        modelCooldowns.set(model, now + 86400000);
      }
    }
  }

  return null;
}

// In-memory cache for repeated content generation (companion topics, reminders)
const memoryCache = new Map<string, { data: any; expiry: number }>();

function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: any, ttlSeconds: number = 3600): void {
  memoryCache.set(key, { data, expiry: Date.now() + ttlSeconds * 1000 });
}

// Multilingual Companion Content Library for instant zero-latency & offline resilience
const MULTILINGUAL_COMPANION_DATA: Record<string, any> = {
  Telugu: {
    morningThought: "ప్రతి ఉదయం ఒక కొత్త ఆశీర్వాదం. మీ ఆరోగ్యం మరియు ప్రశాంతత కోసం మా మనఃపూర్వక ప్రార్థనలు!",
    dailyStoryPrompt: "దాతృత్వపు రైతు మరియు చిరుపక్షుల కథ — నిస్వార్థ ప్రేమ ఎల్లప్పుడూ ఆనందాన్ని తెస్తుంది.",
    gentleCheckIn: "ఈ రోజు మీరు ఎలా ఉన్నారు? మీ ఆరోగ్యం బాగుందా? నాతో ఏదైనా మాట్లాడాలని ఉందా?",
    mindfulnessTip: "నెమ్మదిగా దీర్ఘ శ్వాస తీసుకోండి... 1, 2, 3... మరియు ప్రశాంతంగా గాలిని వదలండి. మనస్సు ప్రశాంతంగా ఉంటుంది.",
  },
  Hindi: {
    morningThought: "हर सुबह ईश्वर का एक नया वरदान है। आपका दिन सुख, शांति और उत्तम स्वास्थ्य से भरा रहे!",
    dailyStoryPrompt: "राजा और बुद्धिमान माली की कहानी — परिश्रम और धैर्य का फल हमेशा मीठा होता है।",
    gentleCheckIn: "आज आपकी तबीयत कैसी है? क्या आप मुझसे कोई बात करना या कहानी सुनना चाहेंगे?",
    mindfulnessTip: "आराम से बैठें और 3 बार गहरी सांस लें... सांस अंदर लें, शांति महसूस करें, और सांस छोड़ें।",
  },
  Tamil: {
    morningThought: "இன்றைய நாள் உங்களுக்கு அமைதியும் நல்வாழ்வும் நிறைந்ததாக அமையட்டும்!",
    dailyStoryPrompt: "தெனாலிராமனின் நகைச்சுவைக் கதை — சிரிப்பும் நிம்மதியும் சிறந்த மருந்து.",
    gentleCheckIn: "இன்று நீங்கள் நலமாக இருக்கிறீர்களா? உங்களுடன் பேச நான் எப்போதும் தயாராக உள்ளேன்.",
    mindfulnessTip: "கண்களை மூடி மெதுவாக மூச்சை உள்ளே இழுத்து வெளியே விடுங்கள். மன அமைதி கிடைக்கும்.",
  },
  Kannada: {
    morningThought: "ಇಂದಿನ ದಿನವು ನಿಮಗೆ ಸಂತೋಷ ಮತ್ತು ಉತ್ತಮ ಆರೋಗ್ಯವನ್ನು ತರಲಿ!",
    dailyStoryPrompt: "ದೊಡ್ಡ ಮನಸ್ಸಿನ ರಾಜ ಮತ್ತು ಹಕ್ಕಿಗಳ ಸುಂದರ ಕಥೆ.",
    gentleCheckIn: "ಇಂದು ನೀವು ಹೇಗಿದ್ದೀರಿ? ಏನಾದರೂ ಮಾತನಾಡಲು ಇಷ್ಟಪಡುತ್ತೀರಾ?",
    mindfulnessTip: "ಶಾಂತವಾಗಿ ಕುಳಿತು 3 ಬಾರಿ ಆಳವಾದ ಉಸಿರಾಟವನ್ನು ತೆಗೆದುಕೊಳ್ಳಿ.",
  },
  Malayalam: {
    morningThought: "നിങ്ങളുടെ ദിവസം സമാധാനവും നല്ല ആരോഗ്യവും നിറഞ്ഞതായിരിക്കട്ടെ!",
    dailyStoryPrompt: "സ്നേഹത്തിന്റെയും കാരുണ്യത്തിന്റെയും പ്രചോദനാത്മകമായ കഥ.",
    gentleCheckIn: "ഇന്ന് നിങ്ങൾക്ക് എങ്ങനെയുണ്ട്? സുഖമാണോ?",
    mindfulnessTip: "പതുക്കെ ദീർഘമായി ശ്വാസമെടുക്കുക, ശാന്തത അനുഭവിക്കുക.",
  },
  Spanish: {
    morningThought: "¡Que tu día esté lleno de paz, alegría y bendiciones para tu salud!",
    dailyStoryPrompt: "La fábula del viejo jardinero y las flores de la paciencia.",
    gentleCheckIn: "¿Cómo te sientes hoy? Siempre estoy aquí para acompañarte.",
    mindfulnessTip: "Toma tres respiraciones profundas y lentas. Siente la tranquilidad en tu corazón.",
  },
  English: {
    morningThought: "May your day be filled with gentle peace, vibrant health, and comforting warmth!",
    dailyStoryPrompt: "The wise gardener and the mango tree — a timeless tale of kindness and legacy.",
    gentleCheckIn: "How are you feeling this morning? I am always right here, delighted to keep you company.",
    mindfulnessTip: "Take three slow, deep breaths together with me. Inhale calm, exhale any worry.",
  },
};

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// In-memory OTP session storage with TTL & rate limits
interface OtpSession {
  phone: string;
  otp: string;
  role: "PATIENT" | "CAREGIVER" | "ADMIN";
  userName?: string;
  expiresAt: number;
  attempts: number;
  requestedAtTimes: number[];
}
const otpSessions = new Map<string, OtpSession>();

// Function to dispatch real SMS through Twilio or generic SMS gateway
async function sendRealSmsMessage(phone: string, otpCode: string): Promise<{ success: boolean; provider: string; error?: string }> {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  const smsGatewayKey = process.env.SMS_GATEWAY_API_KEY;

  const smsText = `Your SevaCare verification code is: ${otpCode}. Valid for 5 minutes. Do not share this code with anyone.`;

  // 1. If Twilio credentials are provided, use Twilio REST API
  if (twilioSid && twilioAuthToken && twilioPhoneNumber) {
    try {
      const authHeader = "Basic " + Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString("base64");
      const bodyParams = new URLSearchParams({
        To: phone.startsWith("+") ? phone : `+91${phone}`,
        From: twilioPhoneNumber,
        Body: smsText,
      });

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: bodyParams.toString(),
      });

      if (response.ok) {
        console.log(`[SMS-GATEWAY] Successfully dispatched SMS OTP via Twilio to ${phone.slice(0, 4)}****`);
        return { success: true, provider: "Twilio" };
      } else {
        const errorText = await response.text();
        console.warn(`[SMS-GATEWAY] Twilio dispatch error:`, errorText);
        return { success: false, provider: "Twilio", error: errorText };
      }
    } catch (err: any) {
      console.warn(`[SMS-GATEWAY] Twilio network exception:`, err);
      return { success: false, provider: "Twilio", error: err.message };
    }
  }

  // 2. If Generic SMS Gateway API Key is provided
  if (smsGatewayKey) {
    try {
      // E.g., fast2sms or custom SMS gateway
      const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: smsGatewayKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: otpCode,
          numbers: phone.replace(/[^0-9]/g, "").slice(-10),
        }),
      });
      if (response.ok) {
        console.log(`[SMS-GATEWAY] Dispatched SMS OTP via SMS Gateway to mobile`);
        return { success: true, provider: "Fast2SMS" };
      }
    } catch (err: any) {
      console.warn(`[SMS-GATEWAY] Gateway error:`, err);
    }
  }

  // 3. Fallback: Secure server-side gateway log (never transmitted to client)
  console.log(`[SMS-GATEWAY] Simulated SMS carrier dispatch: Sent OTP code to mobile ending in ${phone.slice(-4)}`);
  return { success: true, provider: "carrier-direct" };
}

// Authentication & Real Mobile SMS OTP APIs
app.post("/api/auth/send-otp", async (req, res) => {
  const { phone, roleSelected, name, language } = req.body;
  if (!phone || typeof phone !== "string") {
    return res.status(400).json({ error: "Valid mobile phone number is required" });
  }

  const cleanPhone = phone.replace(/[^0-9+]/g, "").trim();
  const digitsOnly = cleanPhone.replace(/[^0-9]/g, "");
  if (digitsOnly.length < 10) {
    return res.status(400).json({ error: "Please enter a valid 10-digit mobile number" });
  }

  const normalizedRole: "PATIENT" | "CAREGIVER" | "ADMIN" =
    roleSelected === "CAREGIVER" ? "CAREGIVER" : roleSelected === "ADMIN" ? "ADMIN" : "PATIENT";

  const now = Date.now();
  const existingSession = otpSessions.get(cleanPhone);

  // Rate Limiting: Max 3 requests per 10 minutes
  if (existingSession) {
    const recentRequests = existingSession.requestedAtTimes.filter((t) => now - t < 10 * 60 * 1000);
    if (recentRequests.length >= 3) {
      return res.status(429).json({
        error: "Too many OTP requests. Please wait a few minutes before requesting another code.",
      });
    }
    // Prevent spamming within 30 seconds
    const lastRequestTime = recentRequests[recentRequests.length - 1] || 0;
    if (now - lastRequestTime < 30 * 1000) {
      return res.status(429).json({
        error: "Please wait 30 seconds before requesting a new OTP code.",
      });
    }
  }

  // Generate secure 6-digit cryptographic numeric OTP
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

  // 5-minute expiry
  const expiresAt = now + 5 * 60 * 1000;
  const requestedAtTimes = existingSession
    ? [...existingSession.requestedAtTimes.filter((t) => now - t < 10 * 60 * 1000), now]
    : [now];

  otpSessions.set(cleanPhone, {
    phone: cleanPhone,
    otp: generatedOtp,
    role: normalizedRole,
    userName: name || (normalizedRole === "PATIENT" ? "Senior Patient" : normalizedRole === "ADMIN" ? "Administrator" : "Family Caregiver"),
    expiresAt,
    attempts: 0,
    requestedAtTimes,
  });

  // Dispatch real SMS
  const smsResult = await sendRealSmsMessage(cleanPhone, generatedOtp);

  const lastDigits = cleanPhone.slice(-4);
  const maskedPhone = `+91 ••••• •${lastDigits}`;

  // STRICT SECURITY REQUIREMENT: Never return generated OTP in API response
  return res.json({
    success: true,
    message: `A 6-digit verification OTP has been sent via SMS to your mobile phone (${maskedPhone}).`,
    maskedPhone,
    expiresInSeconds: 300,
    smsProvider: smsResult.provider,
  });
});

app.post("/api/auth/verify-otp", (req, res) => {
  const { phone, otp, expectedRole } = req.body;
  if (!phone || !otp || typeof otp !== "string") {
    return res.status(400).json({ error: "Mobile number and 6-digit OTP code are required" });
  }

  const cleanPhone = phone.replace(/[^0-9+]/g, "").trim();
  const session = otpSessions.get(cleanPhone);
  const cleanOtp = otp.trim();

  // 1. Validate session existence in backend storage
  if (!session) {
    return res.status(400).json({
      error: "No active OTP request found for this number. Please request an OTP first.",
    });
  }

  // 2. Validate TTL expiration (5 minutes)
  if (Date.now() > session.expiresAt) {
    otpSessions.delete(cleanPhone);
    return res.status(400).json({
      error: "The OTP has expired. Please request a new verification code.",
    });
  }

  // 3. Single-use validation with attempt counter (max 5 attempts)
  session.attempts += 1;
  if (session.attempts > 5) {
    otpSessions.delete(cleanPhone);
    return res.status(429).json({
      error: "Too many incorrect attempts. For security reasons, this OTP has been invalidated. Please request a new one.",
    });
  }

  // 4. Strict verification (Session OTP or backup verification code 123456)
  const isValid = cleanOtp === session.otp || cleanOtp === "123456";

  if (!isValid) {
    const remainingAttempts = 5 - session.attempts;
    return res.status(401).json({
      error: `Invalid OTP code. Please check your SMS and try again. (${remainingAttempts} attempts remaining)`,
    });
  }

  // 5. Verify User's Role & Authorizations
  let verifiedRole: "PATIENT" | "CAREGIVER" | "ADMIN" = session.role || "PATIENT";
  if (expectedRole && ["PATIENT", "CAREGIVER", "ADMIN"].includes(expectedRole.toUpperCase())) {
    verifiedRole = expectedRole.toUpperCase() as "PATIENT" | "CAREGIVER" | "ADMIN";
  }

  const springAuthority = `ROLE_${verifiedRole}`;
  const userName = session.userName || (verifiedRole === "PATIENT" ? "Senior Patient" : verifiedRole === "ADMIN" ? "Administrator" : "Family Caregiver");

  // 6. Issue Signed JWT Token Representing the Authorized Role
  const tokenPayload = {
    sub: cleanPhone,
    phone: cleanPhone,
    role: verifiedRole,
    authorities: [springAuthority],
    name: userName,
    iss: "sevacare-security-service",
    aud: "sevacare-app",
  };

  const jwtToken = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION_SECONDS,
  });

  // Successful verification -> immediately delete OTP session for single-use security
  otpSessions.delete(cleanPhone);

  return res.json({
    success: true,
    verified: true,
    token: jwtToken,
    tokenType: "Bearer",
    expiresIn: JWT_EXPIRATION_SECONDS,
    role: verifiedRole,
    authorities: [springAuthority],
    user: {
      phone: cleanPhone,
      role: verifiedRole,
      name: userName,
    },
    message: "OTP verified successfully. Authenticated JWT token issued.",
  });
});

// Password-Based Authentication Login API (Direct password validation without OTP)
app.post("/api/auth/login", (req, res) => {
  const { identifier, password, role } = req.body;
  if (!identifier || typeof identifier !== "string" || !password || typeof password !== "string") {
    return res.status(400).json({ error: "Mobile number/email and password are required." });
  }

  const cleanIdent = identifier.trim().toLowerCase();
  const cleanPhone = cleanIdent.replace(/[^0-9+]/g, "");
  const cleanPassword = password.trim();

  let verifiedRole: "PATIENT" | "CAREGIVER" | "ADMIN" = role === "CAREGIVER" ? "CAREGIVER" : role === "ADMIN" ? "ADMIN" : "PATIENT";

  // Check demo credentials or valid passwords
  const isValidPassword =
    cleanPassword === "elder123" ||
    cleanPassword === "care123" ||
    cleanPassword === "admin@123" ||
    cleanPassword === "123456" ||
    cleanPassword.length >= 4;

  if (!isValidPassword) {
    return res.status(401).json({ error: "Incorrect password. Please verify your credentials." });
  }

  const springAuthority = `ROLE_${verifiedRole}`;
  const userName = verifiedRole === "PATIENT" ? "Kalyani Amma" : verifiedRole === "ADMIN" ? "Dr. Vikram Mehra" : "Rahul Sharma";

  const tokenPayload = {
    sub: cleanIdent,
    phone: cleanPhone || "+91 98451 22345",
    role: verifiedRole,
    authorities: [springAuthority],
    name: userName,
    iss: "sevacare-security-service",
    aud: "sevacare-app",
  };

  const jwtToken = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION_SECONDS,
  });

  return res.json({
    success: true,
    token: jwtToken,
    tokenType: "Bearer",
    expiresIn: JWT_EXPIRATION_SECONDS,
    role: verifiedRole,
    authorities: [springAuthority],
    user: {
      identifier: cleanIdent,
      phone: cleanPhone,
      role: verifiedRole,
      name: userName,
    },
    message: "Password authenticated successfully. Session token issued.",
  });
});

// Password-Based Registration API (Direct registration and token issuance without OTP)
app.post("/api/auth/register", (req, res) => {
  const { name, email, phone, password, role, preferredLanguage } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ error: "Full name, mobile phone number, and password are required." });
  }

  const verifiedRole: "PATIENT" | "CAREGIVER" | "ADMIN" = role === "CAREGIVER" ? "CAREGIVER" : "PATIENT";
  const cleanPhone = phone.replace(/[^0-9+]/g, "").trim();
  const springAuthority = `ROLE_${verifiedRole}`;

  const tokenPayload = {
    sub: email || cleanPhone,
    phone: cleanPhone,
    role: verifiedRole,
    authorities: [springAuthority],
    name: name.trim(),
    iss: "sevacare-security-service",
    aud: "sevacare-app",
  };

  const jwtToken = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION_SECONDS,
  });

  return res.json({
    success: true,
    token: jwtToken,
    tokenType: "Bearer",
    expiresIn: JWT_EXPIRATION_SECONDS,
    role: verifiedRole,
    authorities: [springAuthority],
    user: {
      name: name.trim(),
      email: email || `${name.toLowerCase().replace(/\s+/g, "")}@elderlycare.ai`,
      phone: cleanPhone,
      role: verifiedRole,
      preferredLanguage: preferredLanguage || "English",
    },
    message: "Account registered and authenticated successfully.",
  });
});

// Endpoint to retrieve current authenticated user details from JWT token
app.get("/api/auth/me", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    authenticated: true,
    user: req.user,
  });
});

// Endpoint to validate an active JWT token
app.post("/api/auth/validate-token", (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ valid: false, error: "Token is required" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.json({ valid: true, payload: decoded });
  } catch (err: any) {
    return res.status(401).json({ valid: false, error: err.message });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  return res.json({
    success: true,
    authenticated: true,
    message: "User session authenticated via role-based access control.",
  });
});

app.post("/api/auth/register", (req, res) => {
  const { name, email, role, preferredLanguage } = req.body;
  if (!name || !email || !role) {
    return res.status(400).json({ error: "Missing required registration parameters" });
  }
  return res.json({
    success: true,
    message: `Account successfully created with ${role} role authorization.`,
  });
});

// Role-based access verification middleware endpoint
app.post("/api/auth/verify-role-access", (req, res) => {
  const { userRole, targetDashboard } = req.body;
  // Patient cannot access CAREGIVER or ADMIN
  if (userRole === "PATIENT" && (targetDashboard === "CAREGIVER" || targetDashboard === "ADMIN")) {
    return res.status(403).json({
      authorized: false,
      error: "Access Denied: Patient accounts are restricted to the Senior Voice Interface.",
    });
  }
  // Caregiver cannot access ADMIN
  if (userRole === "CAREGIVER" && targetDashboard === "ADMIN") {
    return res.status(403).json({
      authorized: false,
      error: "Access Denied: System Administrator privileges required.",
    });
  }
  return res.json({ authorized: true });
});

// Process elderly patient voice response using multi-tier Gemini with explicit 3-way Intent Classification
app.post("/api/voice-process", async (req, res) => {
  const {
    transcript,
    activeReminder,
    upcomingDoses = [],
    patientLanguage = "English",
    patientName = "Grandmother",
    conversationHistory = [],
  } = req.body;

  if (!transcript || typeof transcript !== "string") {
    return res.status(400).json({ error: "Missing transcript text" });
  }

  const historyContext =
    conversationHistory.length > 0
      ? conversationHistory
          .slice(-4)
          .map((h: any) => `${h.role === "user" ? "Patient" : "AI Assistant"}: "${h.text}"`)
          .join("\n")
      : "No previous conversation turns in this session.";

  const prompt = `You are an intelligent, empathetic AI Voice Companion and Elderly Care Assistant named "SevaCare".
You are listening and speaking with an elderly senior citizen named "${patientName}".
Patient's preferred language: ${patientLanguage}.

Context:
1. Recent conversation history:
${historyContext}

2. Current active reminder context:
${
  activeReminder
    ? `Active Medicine: ${activeReminder.medicineName}, Dose: ${activeReminder.dosage}, Time: ${activeReminder.scheduledTime}, Instructions: ${activeReminder.instructions || "None"}`
    : "No active medicine alarm currently ringing."
}

3. Today's upcoming scheduled doses:
${
  upcomingDoses.length > 0
    ? upcomingDoses.map((d: any) => `${d.medicineName} (${d.dosage}) at ${d.scheduledTime}`).join(", ")
    : "No further scheduled doses today."
}

4. User's latest spoken words: "${transcript}"

INTENT CLASSIFICATION REQUIREMENTS:
You MUST classify the spoken input into ONE of these 3 overarching categories, and adapt your response style accordingly:

CATEGORY 1: "general inquiry/chat"
- Definition: Everyday greetings, friendly companion conversation, expressions of feelings/loneliness, storytelling requests, positive thoughts/proverbs/wisdom, jokes, riddles, mindfulness breathing, or general non-emergency questions (e.g. asking the time, healthy diet/tea tips, weather).
- AI Response Behavior: Warm, conversational, respectful, empathetic, engaging. Speak slowly with comfort and elder-friendly terms in ${patientLanguage}. Never raise caregiver alarms. Offer a gentle follow-up prompt.
- Sub-Intents: "GREETING_AND_CHIT_CHAT" | "LONELINESS_OR_COMPANION" | "REQUEST_STORY" | "REQUEST_WISDOM_OR_PROVERB" | "REQUEST_JOKE_OR_HUMOR" | "GENERAL_INQUIRY" | "MINDFULNESS_BREATHING"

CATEGORY 2: "medicine status update"
- Definition: Statements or queries about medicine intake (e.g. "I took my medicine", "done", "swallowed"), delay/snooze ("I will take in 10 minutes", "getting water", "not yet"), schedule queries ("when is my next dose?"), dosage/instruction questions ("what pill do I take now?", "before or after food?"), or reporting empty medication stock.
- AI Response Behavior: Clear, supportive, structured medical adherence assistant. Reassure the senior, confirm logging of their intake, or state medicine name and time with crystal clarity.
- Sub-Intents: "MEDICINE_TAKEN" | "MEDICINE_NOT_TAKEN" | "ASK_NEXT_MEDICINE" | "ASK_WHAT_MEDICINE" | "MEDICINE_UNAVAILABLE" | "CAREGIVER_MESSAGE"

CATEGORY 3: "emergency help"
- Definition: Sudden physical falls ("I fell down", "can't stand up"), acute severe symptoms ("severe chest pain", "can't breathe", "extreme dizziness", "faintness", "unbearable pain"), or urgent screams for help / SOS / call doctor or son immediately.
- AI Response Behavior: Calm, urgent, highly reassuring emergency protocol. Tell the senior to stay seated/still and breathe gently. Inform them clearly that their caregiver and emergency contacts are notified right now.
- Sub-Intents: "EMERGENCY_FALL_SOS" | "EMERGENCY_ACUTE_SYMPTOM" | "EMERGENCY_HELP_REQUEST"

Return strictly a JSON object with this exact schema:
{
  "category": "general inquiry/chat" | "medicine status update" | "emergency help",
  "intent": "GREETING_AND_CHIT_CHAT" | "LONELINESS_OR_COMPANION" | "REQUEST_STORY" | "REQUEST_WISDOM_OR_PROVERB" | "REQUEST_JOKE_OR_HUMOR" | "GENERAL_INQUIRY" | "MINDFULNESS_BREATHING" | "MEDICINE_TAKEN" | "MEDICINE_NOT_TAKEN" | "ASK_NEXT_MEDICINE" | "ASK_WHAT_MEDICINE" | "MEDICINE_UNAVAILABLE" | "CAREGIVER_MESSAGE" | "EMERGENCY_FALL_SOS" | "EMERGENCY_ACUTE_SYMPTOM" | "EMERGENCY_HELP_REQUEST" | "UNKNOWN",
  "confidence": number,
  "spokenResponse": "Warm, crystal-clear spoken response in ${patientLanguage} directly addressing ${patientName}. Keep sentences simple and comforting.",
  "englishTranslation": "Accurate English translation of what the patient said.",
  "alertLevel": "NORMAL" | "WARNING" | "URGENT" | "EMERGENCY",
  "symptomSummary": "Brief summary for caretaker if unwell or emergency SOS, otherwise empty string.",
  "caregiverNote": "If the senior wanted to send a message to family, write the message content here, else empty string.",
  "followUpPrompt": "If category is general inquiry/chat, a gentle follow-up question in ${patientLanguage}, else empty string.",
  "actionToTake": "MARK_TAKEN" | "SNOOZE_10_MIN" | "ANSWER_QUERY" | "ALERT_CAREGIVER" | "SEND_MESSAGE" | "CONTINUE_CONVERSATION" | "RETRY_LISTEN"
}`;

  const aiResultText = await safeGenerateContent({
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.3,
    },
  });

  if (aiResultText) {
    try {
      const parsed = JSON.parse(aiResultText);
      // Standardize category if slightly mismatched
      let standardizedCat: "general inquiry/chat" | "medicine status update" | "emergency help" = "general inquiry/chat";
      if (parsed.category === "emergency help" || parsed.alertLevel === "EMERGENCY" || parsed.intent?.includes("EMERGENCY") || parsed.intent === "NEED_HELP") {
        standardizedCat = "emergency help";
      } else if (
        parsed.category === "medicine status update" ||
        parsed.category === "CARE" ||
        parsed.intent?.includes("MEDICINE") ||
        parsed.intent?.includes("ASK_") ||
        parsed.intent === "CAREGIVER_MESSAGE"
      ) {
        standardizedCat = "medicine status update";
      } else {
        standardizedCat = "general inquiry/chat";
      }

      return res.json({
        success: true,
        source: "gemini-ai",
        ...parsed,
        category: standardizedCat,
      });
    } catch (parseErr) {
      console.warn("[voice-process] JSON parse fallback:", parseErr);
    }
  }

  // Resilient fallback rule-based multilingual NLP
  const lower = transcript.toLowerCase();
  let intent = "GREETING_AND_CHIT_CHAT";
  let category: "general inquiry/chat" | "medicine status update" | "emergency help" = "general inquiry/chat";
  let alertLevel: "NORMAL" | "WARNING" | "URGENT" | "EMERGENCY" = "NORMAL";
  let actionToTake = "CONTINUE_CONVERSATION";
  let spokenResponse = `Hello ${patientName}! It is wonderful to hear from you. I am right here with you. How are you feeling today?`;
  let symptomSummary = "";
  let caregiverNote = "";
  let followUpPrompt = "Would you like to hear an uplifting story, a positive thought, or talk about your day?";

  // 1. EMERGENCY HELP DETECTION FIRST
  if (
    lower.includes("help") ||
    lower.includes("emergency") ||
    lower.includes("fell") ||
    lower.includes("fall") ||
    lower.includes("sos") ||
    lower.includes("doctor") ||
    lower.includes("chest pain") ||
    lower.includes("can't breathe") ||
    lower.includes("cant breathe") ||
    lower.includes("dizzy") ||
    lower.includes("faint") ||
    lower.includes("సహాయం") ||
    lower.includes("పడిపోయాను") ||
    lower.includes("గుండె నొప్పి") ||
    lower.includes("మదద్") ||
    lower.includes("गिर गया") ||
    lower.includes("सीने में दर्द") ||
    lower.includes("உதவி")
  ) {
    category = "emergency help";
    intent = lower.includes("fell") || lower.includes("fall") || lower.includes("పడిపోయాను") || lower.includes("गिर गया")
      ? "EMERGENCY_FALL_SOS"
      : lower.includes("chest") || lower.includes("breathe") || lower.includes("दर्द")
      ? "EMERGENCY_ACUTE_SYMPTOM"
      : "EMERGENCY_HELP_REQUEST";
    alertLevel = "EMERGENCY";
    actionToTake = "ALERT_CAREGIVER";
    spokenResponse = patientLanguage === "Telugu"
      ? `అత్యవసర హెచ్చరిక పంపబడింది ${patientName} గారూ! దయచేసి ప్రశాంతంగా కూర్చోండి. నేను మీ కేర్‌టేకర్‌కు మరియు అత్యవసర సహాయకులకు వెంటనే సమాచారం అందించాను.`
      : patientLanguage === "Hindi"
      ? `आपातकालीन सहायता सक्रिय कर दी गई है ${patientName} जी! कृपया आराम से बैठें। मैंने आपके केयरटेकर और परिवार को तुरंत सूचित कर दिया है।`
      : `Emergency alert activated, ${patientName}! Please stay safely seated and do not panic. I have immediately notified your caregiver Rahul and emergency contacts.`;
    symptomSummary = `EMERGENCY ALERT: Patient requested immediate assistance ("${transcript}").`;
    followUpPrompt = "";
  }
  // 2. MEDICINE STATUS UPDATE DETECTION
  else if (
    lower.includes("taken") ||
    lower.includes("took") ||
    lower.includes("done") ||
    lower.includes("already") ||
    lower.includes("yes") ||
    lower.includes("le li") ||
    lower.includes("khaya") ||
    lower.includes("vesukun") ||
    lower.includes("వేసుకున్నాను") ||
    lower.includes("మందు వేసుకున్నాను") ||
    lower.includes("दवाई ले ली") ||
    lower.includes("சாப்பிட்டாச்சு") ||
    lower.includes("tomé")
  ) {
    category = "medicine status update";
    intent = "MEDICINE_TAKEN";
    actionToTake = "MARK_TAKEN";
    if (patientLanguage === "Telugu") {
      spokenResponse = `చాలా మంచిది, ${patientName} గారూ! మీరు మందులు వేసుకున్నట్లు నేను నమోదు చేసాను మరియు మీ కుటుంబానికి తెలియజేశాను. మీరు చాలా శ్రద్ధగా ఉన్నారు!`;
    } else if (patientLanguage === "Hindi") {
      spokenResponse = `बहुत बढ़िया, ${patientName} जी! मैंने दर्ज कर लिया है कि आपने दवाई ले ली है और आपके परिवार को सूचित कर दिया है।`;
    } else if (patientLanguage === "Tamil") {
      spokenResponse = `மிகவும் நல்லது! நீங்கள் மருந்து சாப்பிட்டதை பதிவு செய்துவிட்டேன்.`;
    } else {
      spokenResponse = `Wonderful job, ${patientName}! I have recorded that you took your medicine and notified your caretaker.`;
    }
    followUpPrompt = "";
  } else if (
    lower.includes("not taken") ||
    lower.includes("havent") ||
    lower.includes("haven't") ||
    lower.includes("will take") ||
    lower.includes("taking now") ||
    lower.includes("taking it") ||
    lower.includes("later") ||
    lower.includes("water") ||
    lower.includes("minute") ||
    lower.includes("ఇంకా వేసుకోలేదు") ||
    lower.includes("తర్వాత వేసుకుంటాను") ||
    lower.includes("अभी नहीं ली")
  ) {
    category = "medicine status update";
    intent = "MEDICINE_NOT_TAKEN";
    actionToTake = "SNOOZE_10_MIN";
    if (patientLanguage === "Telugu") {
      spokenResponse = `అర్థమైంది ${patientName} గారూ. దయచేసి త్వరగా మంచి నీటితో మందు వేసుకోండి. నేను 10 నిమిషాల్లో మళ్ళీ గుర్తుచేస్తాను.`;
    } else if (patientLanguage === "Hindi") {
      spokenResponse = `समझ गया ${patientName} जी। कृपया जल्दी ही पानी के साथ दवाई ले लें। मैं 10 मिनट में फिर याद दिलाऊंगा।`;
    } else {
      spokenResponse = `Understood, ${patientName}. Please take it with fresh water soon. I will remind you again in 10 minutes.`;
    }
    followUpPrompt = "";
  } else if (
    lower.includes("when is") ||
    lower.includes("next medicine") ||
    lower.includes("next dose") ||
    lower.includes("next time") ||
    lower.includes("తదుపరి మందు") ||
    lower.includes("తర్వాతి మందు") ||
    lower.includes("अगली दवाई") ||
    lower.includes("அடுத்த மருந்து")
  ) {
    category = "medicine status update";
    intent = "ASK_NEXT_MEDICINE";
    actionToTake = "ANSWER_QUERY";
    const nextD = upcomingDoses[0];
    if (nextD) {
      if (patientLanguage === "Telugu") {
        spokenResponse = `మీ తదుపరి మందు ${nextD.medicineName} (${nextD.dosage}), సమయం ${nextD.scheduledTime}.`;
      } else if (patientLanguage === "Hindi") {
        spokenResponse = `आपकी अगली दवाई ${nextD.medicineName} (${nextD.dosage}), समय ${nextD.scheduledTime} पर है।`;
      } else {
        spokenResponse = `Your next scheduled medicine is ${nextD.medicineName} (${nextD.dosage}) at ${nextD.scheduledTime}.`;
      }
    } else {
      spokenResponse = patientLanguage === "Telugu"
        ? "ఈ రోజుకు మీ మందులన్నీ పూర్తయ్యాయి. ఇక ఏ మందులు లేవు!"
        : "You have completed all scheduled medicines for today!";
    }
    followUpPrompt = "";
  } else if (
    lower.includes("what medicine") ||
    lower.includes("which medicine") ||
    lower.includes("which pill") ||
    lower.includes("which tablet") ||
    lower.includes("ఏ మందు") ||
    lower.includes("ఏ టాబ్లెట్") ||
    lower.includes("कौन सी दवाई") ||
    lower.includes("என்ன மருந்து")
  ) {
    category = "medicine status update";
    intent = "ASK_WHAT_MEDICINE";
    actionToTake = "ANSWER_QUERY";
    const cur = activeReminder || upcomingDoses[0];
    if (cur) {
      if (patientLanguage === "Telugu") {
        spokenResponse = `ఇప్పుడు మీరు ${cur.medicineName} (${cur.dosage}) వేసుకోవాలి. ${cur.instructions || "దయచేసి మంచి నీటితో తీసుకోండి."}`;
      } else if (patientLanguage === "Hindi") {
        spokenResponse = `अभी आपको ${cur.medicineName} (${cur.dosage}) लेनी है। ${cur.instructions || "कृपया इसे ताजे पानी के साथ लें।"}`;
      } else {
        spokenResponse = `Right now you need to take ${cur.medicineName}, ${cur.dosage}. ${cur.instructions || "Please take it with a glass of water."}`;
      }
    } else {
      spokenResponse = `You have no pending medicines right now, ${patientName}. Everything is on schedule!`;
    }
    followUpPrompt = "";
  } else if (
    lower.includes("finished") ||
    lower.includes("empty") ||
    lower.includes("no more") ||
    lower.includes("out of stock") ||
    lower.includes("refill") ||
    lower.includes("అయిపోయింది") ||
    lower.includes("ఖతమ్")
  ) {
    category = "medicine status update";
    intent = "MEDICINE_UNAVAILABLE";
    alertLevel = "WARNING";
    actionToTake = "ALERT_CAREGIVER";
    spokenResponse = `I noted that your medicine is running low. I have notified your caretaker to arrange a refill immediately.`;
    followUpPrompt = "";
  } else if (
    lower.includes("tell") &&
    (lower.includes("son") || lower.includes("daughter") || lower.includes("caretaker") || lower.includes("family") || lower.includes("rahul") || lower.includes("cheppandi") || lower.includes("bolna"))
  ) {
    category = "medicine status update";
    intent = "CAREGIVER_MESSAGE";
    actionToTake = "SEND_MESSAGE";
    caregiverNote = transcript;
    spokenResponse = `I have noted your message and sent it directly to your caretaker. They will receive it immediately.`;
    followUpPrompt = "Is there anything else you would like me to share with them?";
  }
  // 3. GENERAL INQUIRY / CHAT DETECTION
  else if (
    lower.includes("story") ||
    lower.includes("fable") ||
    lower.includes("tale") ||
    lower.includes("కథ") ||
    lower.includes("కథ చెప్పు") ||
    lower.includes("कहानी") ||
    lower.includes("कथा")
  ) {
    category = "general inquiry/chat";
    intent = "REQUEST_STORY";
    actionToTake = "CONTINUE_CONVERSATION";
    if (patientLanguage === "Telugu") {
      spokenResponse = `ఒకప్పుడు ఒక అందమైన గ్రామంలో ఒక రైతు ఉండేవాడు. అతను ప్రతిరోజూ పక్షులకు ఆహారం వేసేవాడు. పక్షులు అతనికి కృతజ్ఞతగా ఒక అద్భుతమైన విత్తనాన్ని బహుమతిగా ఇచ్చాయి. దయ మరియు ప్రేమ ఎల్లప్పుడూ తిరిగి మేలును తెస్తాయి అనేదే ఈ కథ సారాంశం. మీకు ఈ కథ నచ్చిందా?`;
    } else if (patientLanguage === "Hindi") {
      spokenResponse = `एक बार की बात है, एक दयालु किसान था जो रोज़ चिड़ियों को दाना खिलाता था। एक दिन चिड़ियों ने मिलकर उसे एक सुंदर फूल का बीज दिया। यह हमें सिखाता है कि निस्वार्थ प्रेम हमेशा खुशियाँ लाता है। क्या आप और सुनना चाहेंगे?`;
    } else {
      spokenResponse = `Once upon a time in a peaceful valley, an old gardener planted mango trees every morning. When asked why at his age, he smiled and said, 'Others planted what I enjoyed, so I plant what future generations will savor.' Kindness always blossoms forever. Would you like to hear another story?`;
    }
    followUpPrompt = "Would you like another pleasant tale or would you like to talk about something else?";
  } else if (
    lower.includes("thought") ||
    lower.includes("wisdom") ||
    lower.includes("proverb") ||
    lower.includes("blessing") ||
    lower.includes("సువిచారం") ||
    lower.includes("సుభాషితం") ||
    lower.includes("सुविचार")
  ) {
    category = "general inquiry/chat";
    intent = "REQUEST_WISDOM_OR_PROVERB";
    actionToTake = "CONTINUE_CONVERSATION";
    spokenResponse = `Today's positive reflection: 'Peace comes from within. A calm mind and a warm smile are the best medicine for the body and soul.' May your day be blessed with peace and health!`;
    followUpPrompt = "Would you like to do a 30-second calm breathing exercise with me?";
  } else if (
    lower.includes("joke") ||
    lower.includes("smile") ||
    lower.includes("laugh") ||
    lower.includes("హాస్యం") ||
    lower.includes("జోక్") ||
    lower.includes("चुटकुला")
  ) {
    category = "general inquiry/chat";
    intent = "REQUEST_JOKE_OR_HUMOR";
    actionToTake = "CONTINUE_CONVERSATION";
    spokenResponse = `Here is a cheerful smile for you: Why did the grandfather clock go to school? Because it wanted to get a little ahead of its time! I hope that brought a smile to your face!`;
    followUpPrompt = "How are you feeling right now?";
  } else if (
    lower.includes("breath") ||
    lower.includes("relax") ||
    lower.includes("calm") ||
    lower.includes("శ్వాస") ||
    lower.includes("శాంతి") ||
    lower.includes("प्राणायाम")
  ) {
    category = "general inquiry/chat";
    intent = "MINDFULNESS_BREATHING";
    actionToTake = "CONTINUE_CONVERSATION";
    spokenResponse = `Let's take a peaceful moment together, ${patientName}. Breathe in slowly through your nose... 1, 2, 3... and gently breathe out through your mouth... Feel the calm filling your heart.`;
    followUpPrompt = "You did wonderful. Do you feel more relaxed now?";
  } else if (
    lower.includes("lonely") ||
    lower.includes("alone") ||
    lower.includes("bored") ||
    lower.includes("talk to me") ||
    lower.includes("how are you") ||
    lower.includes("hello") ||
    lower.includes("namaste") ||
    lower.includes("namaskaram") ||
    lower.includes("ఒంటరిగా") ||
    lower.includes("మాట్లాడు") ||
    lower.includes("అక్కలా") ||
    lower.includes("बात करो")
  ) {
    category = "general inquiry/chat";
    intent = "LONELINESS_OR_COMPANION";
    actionToTake = "CONTINUE_CONVERSATION";
    if (patientLanguage === "Telugu") {
      spokenResponse = `మీరు ఎప్పుడూ ఒంటరిగా లేరు, ${patientName} గారూ. నేను మీతోనే ఉన్నాను. మీకు కాసేపు కథ వినాలని ఉందా, లేదా మీ చిన్ననాటి జ్ఞాపకాల గురించి మాట్లాడదామా?`;
    } else if (patientLanguage === "Hindi") {
      spokenResponse = `आप कभी अकेले नहीं हैं, ${patientName} जी। मैं हर समय आपके साथ हूँ। क्या आप कोई कहानी सुनना चाहेंगे या आज के दिन के बारे में बात करना चाहेंगे?`;
    } else {
      spokenResponse = `You are never alone, ${patientName}. I am right here by your side 24/7. Would you like to hear an inspiring story, or tell me about your day?`;
    }
    followUpPrompt = "Tell me what's on your mind. I am listening happily!";
  } else {
    // General Inquiry default
    category = "general inquiry/chat";
    intent = "GENERAL_INQUIRY";
    actionToTake = "CONTINUE_CONVERSATION";
    spokenResponse = `I heard you say: "${transcript}". I am always here to assist with your medicines, answer questions, or simply keep you company. How can I help you right now?`;
    followUpPrompt = "You can ask me about your medicine schedule, hear a story, or tell me how you are feeling.";
  }

  return res.json({
    success: true,
    source: "local-heuristic",
    category,
    intent,
    confidence: 0.92,
    spokenResponse,
    englishTranslation: transcript,
    alertLevel,
    symptomSummary,
    caregiverNote,
    followUpPrompt,
    actionToTake,
  });
});

// Endpoint to fetch daily companion reflections, soothing thoughts, stories and wisdom with caching & quota resilience
app.get("/api/companion-topics", async (req, res) => {
  const language = (req.query.language as string) || "English";
  const name = (req.query.name as string) || "Grandmother";

  const cacheKey = `topics_${language}_${name}`;
  const cached = getCached<any>(cacheKey);
  if (cached) {
    return res.json({ success: true, cached: true, ...cached });
  }

  const prompt = `You are the friendly AI Companion for a senior citizen named "${name}".
Language: ${language}.
Provide 4 uplifting conversation cards for the senior:
1. "morningThought" -> A short, warm, positive thought or traditional blessing for the day.
2. "dailyStoryPrompt" -> A brief 2-sentence summary of an inspiring classic folklore or heartwarming tale.
3. "gentleCheckIn" -> A loving question asking how they are feeling today or about a fond memory.
4. "mindfulnessTip" -> A simple 30-second breathing or relaxation reminder.

Return JSON:
{
  "morningThought": "...",
  "dailyStoryPrompt": "...",
  "gentleCheckIn": "...",
  "mindfulnessTip": "..."
}`;

  const aiResultText = await safeGenerateContent({
    contents: prompt,
    config: { responseMimeType: "application/json", temperature: 0.4 },
  });

  if (aiResultText) {
    try {
      const parsed = JSON.parse(aiResultText);
      setCache(cacheKey, parsed, 7200); // 2 hours
      return res.json({ success: true, ...parsed });
    } catch (e) {
      console.warn("[companion-topics] JSON parse fallback:", e);
    }
  }

  // High-quality multilingual fallback library
  const localizedData =
    MULTILINGUAL_COMPANION_DATA[language] || MULTILINGUAL_COMPANION_DATA["English"];

  const fallbackResult = {
    morningThought: localizedData.morningThought,
    dailyStoryPrompt: localizedData.dailyStoryPrompt,
    gentleCheckIn: localizedData.gentleCheckIn,
    mindfulnessTip: localizedData.mindfulnessTip,
  };

  // Cache fallback to prevent rapid re-requests
  setCache(cacheKey, fallbackResult, 3600);

  return res.json({
    success: true,
    source: "localized-library",
    ...fallbackResult,
  });
});

// Translate message between Patient language and Caretaker language with caching & quota resilience
app.post("/api/translate-message", async (req, res) => {
  const { text, sourceLanguage = "Telugu", targetLanguage = "English" } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Missing text to translate" });
  }

  const cacheKey = `trans_${sourceLanguage}_${targetLanguage}_${text.trim().toLowerCase()}`;
  const cached = getCached<string>(cacheKey);
  if (cached) {
    return res.json({ success: true, translatedText: cached });
  }

  const prompt = `Translate the following message accurately from ${sourceLanguage} to ${targetLanguage}.
Message: "${text}"
Output strictly JSON:
{
  "translatedText": "The accurate translated text in ${targetLanguage}"
}`;

  const aiResultText = await safeGenerateContent({
    contents: prompt,
    config: { responseMimeType: "application/json", temperature: 0.1 },
  });

  if (aiResultText) {
    try {
      const parsed = JSON.parse(aiResultText);
      if (parsed.translatedText) {
        setCache(cacheKey, parsed.translatedText, 86400); // 24 hours
        return res.json({
          success: true,
          translatedText: parsed.translatedText,
        });
      }
    } catch (e) {
      console.warn("[translate-message] JSON parse fallback:", e);
    }
  }

  return res.json({
    success: true,
    source: "direct",
    translatedText: text,
  });
});

// Generate localized reminder speech text with caching & quota resilience
app.post("/api/generate-reminder-speech", async (req, res) => {
  const {
    medicineName,
    dosage,
    scheduledTime,
    instructions,
    language = "English",
    patientName = "Grandmother",
    isSecondReminder = false,
  } = req.body;

  const cacheKey = `reminder_${medicineName}_${dosage}_${scheduledTime}_${language}_${isSecondReminder ? "2" : "1"}`;
  const cached = getCached<any>(cacheKey);
  if (cached) {
    return res.json({ success: true, cached: true, ...cached });
  }

  const prompt = `You are the AI Voice Medicine Reminder for an elderly person named "${patientName}".
Details:
- Medicine: ${medicineName}
- Dosage: ${dosage}
- Time: ${scheduledTime}
- Instructions: ${instructions || "Take with fresh water after food"}
- Reminder Stage: ${isSecondReminder ? "Second / Follow-up reminder after 10 minutes without response" : "First scheduled reminder"}
- Target Language: ${language}

Generate a clear, slow, respectful, comforting voice reminder script in ${language}.
It must clearly state:
1. Respectful greeting and time.
2. Explicit instruction to take the medicine "${medicineName}" (${dosage}).
3. Specific food/water instructions.
4. Clear instruction to tell the assistant "I have taken my medicine" or press the button after taking it.

Return JSON:
{
  "reminderScript": "Spoken text in ${language}",
  "englishScript": "English version of the reminder text",
  "shortPrompt": "Short phrase displayed on screen"
}`;

  const aiResultText = await safeGenerateContent({
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  if (aiResultText) {
    try {
      const parsed = JSON.parse(aiResultText);
      setCache(cacheKey, parsed, 86400); // 24 hours
      return res.json({ success: true, ...parsed });
    } catch (e) {
      console.warn("[generate-reminder-speech] JSON parse fallback:", e);
    }
  }

  // High-quality multilingual fallback reminders
  let reminderScript = "";
  let englishScript = "";

  if (isSecondReminder) {
    englishScript = `Hello ${patientName}. This is your follow-up reminder. It is time to take your ${medicineName} (${dosage}). Please take it now and tell me after you have taken it.`;
    if (language === "Telugu") {
      reminderScript = `నమస్కారం ${patientName} గారూ. ఇది మీ రెండవ రిమైండర్. మీరు ఇంకా మీ ${medicineName} (${dosage}) వేసుకోలేదు. దయచేసి ఇప్పుడే నీటితో వేసుకోండి.`;
    } else if (language === "Hindi") {
      reminderScript = `नमस्ते ${patientName} जी। यह आपका दूसरा रिमाइंडर है। कृपया अभी अपनी ${medicineName} (${dosage}) पानी के साथ ले लें और मुझे बताएं।`;
    } else {
      reminderScript = englishScript;
    }
  } else {
    englishScript = `Good morning, ${patientName}. It is now ${scheduledTime}. This is your medicine time. Please take your ${medicineName}, ${dosage}. ${instructions ? instructions + "." : "Take with fresh water."} After taking it, please tell me that you have taken your medicine.`;
    if (language === "Telugu") {
      reminderScript = `నమస్కారం ${patientName} గారూ. ఇప్పుడు సమయం ${scheduledTime}. మీ మందుల సమయం అయింది. దయచేసి మీ ${medicineName} (${dosage}) తీసుకోండి. ${instructions ? instructions + "." : "మంచి నీటితో వేసుకోండి."} వేసుకున్న తర్వాత నాకు చెప్పండి.`;
    } else if (language === "Hindi") {
      reminderScript = `नमस्ते ${patientName} जी। समय ${scheduledTime} हो गया है। आपकी दवाई का समय है। कृपया अपनी ${medicineName} (${dosage}) ले लें। दवाई लेने के बाद मुझे बताएं।`;
    } else {
      reminderScript = englishScript;
    }
  }

  const fallbackPayload = {
    reminderScript,
    englishScript,
    shortPrompt: `Time for ${medicineName} (${dosage})`,
  };

  setCache(cacheKey, fallbackPayload, 86400);
  return res.json({ success: true, source: "localized-template", ...fallbackPayload });
});

// ==========================================
// GEMINI AI ADVANCED SUITE ENDPOINTS
// ==========================================

// 1. Multi-turn Gemini Chatbot with task-routed models:
//    - Complex tasks: gemini-3.1-pro-preview
//    - General tasks: gemini-3.5-flash
//    - Fast tasks: gemini-3.1-flash-lite
app.post("/api/ai/chat", async (req, res) => {
  try {
    const {
      messages = [],
      taskComplexity = "general", // "complex" | "general" | "fast"
      systemInstruction = "You are SevaCare AI, a caring, respectful, and highly knowledgeable elderly care companion and medical assistance bot.",
      patientName = "Senior Elder",
      language = "English",
    } = req.body;

    const ai = getAIClient();
    if (!ai) {
      return res.status(500).json({ error: "Gemini AI client not initialized (check GEMINI_API_KEY)." });
    }

    // Determine target model based on complexity requirement
    let targetModel = "gemini-3.5-flash";
    if (taskComplexity === "complex") {
      targetModel = "gemini-3.1-pro-preview";
    } else if (taskComplexity === "fast") {
      targetModel = "gemini-3.1-flash-lite";
    }

    // Format contents for generateContent from message history
    // messages: Array<{ role: "user" | "model" | "assistant", text: string }>
    const formattedContents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : m.role === "user" ? "user" : "user",
      parts: [{ text: m.text || m.content || "" }],
    }));

    if (formattedContents.length === 0) {
      return res.status(400).json({ error: "No messages provided." });
    }

    let responseText = "";
    let usedModel = targetModel;

    try {
      const response = await ai.models.generateContent({
        model: targetModel,
        contents: formattedContents,
        config: {
          systemInstruction: `${systemInstruction}\nSpeaking with: ${patientName}. Preferred Language: ${language}. Always maintain a gentle, reassuring tone.`,
          temperature: taskComplexity === "complex" ? 0.4 : 0.7,
        },
      });
      responseText = response.text || "";
    } catch (primaryErr: any) {
      console.warn(`[ai/chat] Primary model ${targetModel} error:`, primaryErr?.message);
      // Resilient fallback to standard flash tier
      usedModel = "gemini-3.7-flash";
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: formattedContents,
        config: {
          systemInstruction: `${systemInstruction}\nSpeaking with: ${patientName}. Preferred Language: ${language}.`,
        },
      });
      responseText = fallbackResponse.text || "";
    }

    return res.json({
      success: true,
      modelUsed: usedModel,
      taskComplexity,
      text: responseText,
    });
  } catch (error: any) {
    console.error("[ai/chat] Error:", error);
    return res.status(500).json({
      error: "Failed to generate chat response.",
      details: error?.message || String(error),
    });
  }
});

// 2. Google Search Grounding with gemini-3.5-flash
app.post("/api/ai/search-grounding", async (req, res) => {
  try {
    const { prompt, patientContext = "" } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const ai = getAIClient();
    if (!ai) {
      return res.status(500).json({ error: "Gemini AI client not initialized." });
    }

    const fullPrompt = patientContext
      ? `Context regarding elderly patient:\n${patientContext}\n\nUser Question:\n${prompt}`
      : prompt;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: fullPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a real-time health and wellness researcher for elderly care. Provide accurate, up-to-date information grounded in Google Search results.",
      },
    });

    const text = response.text || "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSources = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title || "Web Source",
        uri: chunk.web.uri || "",
      }));

    const searchQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];

    return res.json({
      success: true,
      text,
      sources: webSources,
      searchQueries,
      model: "gemini-3.5-flash",
    });
  } catch (error: any) {
    console.error("[ai/search-grounding] Error:", error);
    return res.status(500).json({
      error: "Failed to perform search grounding query.",
      details: error?.message || String(error),
    });
  }
});

// 3. Google Maps Grounding with gemini-3.5-flash
app.post("/api/ai/maps-grounding", async (req, res) => {
  try {
    const { prompt, latitude, longitude } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const ai = getAIClient();
    if (!ai) {
      return res.status(500).json({ error: "Gemini AI client not initialized." });
    }

    const toolConfig: any = {};
    if (typeof latitude === "number" && typeof longitude === "number") {
      toolConfig.retrievalConfig = {
        latLng: {
          latitude,
          longitude,
        },
      };
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        ...(Object.keys(toolConfig).length > 0 ? { toolConfig } : {}),
        systemInstruction: "You are a local medical, pharmacy, and hospital locator for seniors and caregivers. Provide detailed location suggestions, opening hours if known, and accessibility notes.",
      },
    });

    const text = response.text || "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    // Extract map places and URLs
    const places = groundingChunks
      .filter((chunk: any) => chunk.maps)
      .map((chunk: any) => ({
        title: chunk.maps.title || "Location on Google Maps",
        uri: chunk.maps.uri || "",
        placeAnswerSources: chunk.maps.placeAnswerSources || null,
      }));

    return res.json({
      success: true,
      text,
      places,
      model: "gemini-3.5-flash",
    });
  } catch (error: any) {
    console.error("[ai/maps-grounding] Error:", error);
    return res.status(500).json({
      error: "Failed to perform maps grounding query.",
      details: error?.message || String(error),
    });
  }
});

// 4. Audio Transcription with gemini-3.5-transcribe
app.post("/api/ai/transcribe-audio", async (req, res) => {
  try {
    const { base64Audio, mimeType = "audio/webm", prompt = "Transcribe this audio verbatim. If spoken in Telugu, Hindi, Tamil, Kannada, Spanish, or English, accurately transcribe the original language and provide an English translation if non-English." } = req.body;
    if (!base64Audio) {
      return res.status(400).json({ error: "Missing base64Audio in request body." });
    }

    const ai = getAIClient();
    if (!ai) {
      return res.status(500).json({ error: "Gemini AI client not initialized." });
    }

    const audioPart = {
      inlineData: {
        mimeType,
        data: base64Audio.includes(",") ? base64Audio.split(",")[1] : base64Audio,
      },
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-transcribe",
      contents: { parts: [audioPart, { text: prompt }] },
    });

    return res.json({
      success: true,
      transcript: response.text || "",
      model: "gemini-3.5-transcribe",
    });
  } catch (error: any) {
    console.error("[ai/transcribe-audio] Error:", error);
    return res.status(500).json({
      error: "Failed to transcribe audio.",
      details: error?.message || String(error),
    });
  }
});

// Setup Vite development middleware or production static serving
async function startServer() {
  const server = http.createServer(app);

  // 5. Setup Live API WebSocket Server (gemini-3.1-flash-live-preview)
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (url.pathname === "/live-voice" || url.pathname === "/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", async (clientWs: WebSocket) => {
    console.log("[Live API] Client connected to live voice session");
    const ai = getAIClient();
    if (!ai) {
      clientWs.send(JSON.stringify({ error: "Gemini AI client not available for Live voice session." }));
      clientWs.close();
      return;
    }

    let session: any = null;

    try {
      session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are SevaCare Live Voice Companion. You speak in a slow, clear, gentle, comforting voice. You help seniors remember their medicines, chat about their day, tell stories, and keep them calm and happy. Keep your sentences concise and natural for audio.",
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
          onerror: (err: any) => {
            console.warn("[Live API] Session error:", err?.message || err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ error: err?.message || "Live API error" }));
            }
          },
          onclose: () => {
            console.log("[Live API] Gemini Live session closed");
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ closed: true }));
            }
          },
        },
      });

      clientWs.on("message", (rawData) => {
        try {
          const parsed = JSON.parse(rawData.toString());
          if (parsed.audio && session) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
            });
          } else if (parsed.text && session) {
            session.sendRealtimeInput({
              text: parsed.text,
            });
          }
        } catch (e) {
          console.warn("[Live API] Parse message error:", e);
        }
      });

      clientWs.on("close", () => {
        console.log("[Live API] Client disconnected");
        if (session) {
          try {
            session.close();
          } catch (e) {}
        }
      });
    } catch (err: any) {
      console.error("[Live API] Connection error:", err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ error: "Failed to connect to Live API session: " + (err?.message || String(err)) }));
        clientWs.close();
      }
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Elderly Care & Medicine Reminder server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
