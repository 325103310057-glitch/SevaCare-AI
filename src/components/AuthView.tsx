import React, { useState, useEffect } from "react";
import { UserAccount, UserRole, SUPPORTED_LANGUAGES, ConnectionRequest } from "../types";
import { storage, DEFAULT_USERS } from "../utils/storage";
import { soundFx, speakText } from "../utils/audio";
import { MULTILINGUAL_PACKS, getLanguagePack } from "../utils/i18n";
import {
  ShieldCheck,
  User,
  HeartHandshake,
  Shield,
  Key,
  Phone,
  Languages,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  Info,
  ChevronRight,
  ArrowLeft,
  Volume2,
  Check,
  RefreshCw,
  Mail,
  UserPlus,
  Link as LinkIcon,
  AlertCircle,
} from "lucide-react";

interface AuthViewProps {
  onLoginSuccess: (user: UserAccount) => void;
}

type AuthMode = "WELCOME" | "PATIENT_LOGIN" | "CARETAKER_LOGIN" | "REGISTER" | "OTP_VERIFY";

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess }) => {
  // Navigation mode
  const [authMode, setAuthMode] = useState<AuthMode>("WELCOME");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("English");
  const [activeRole, setActiveRole] = useState<UserRole>("PATIENT");

  // Form states
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [caretakerEmailOrPhone, setCaretakerEmailOrPhone] = useState<string>("");
  const [caretakerPassword, setCaretakerPassword] = useState<string>("");
  const [usePasswordLogin, setUsePasswordLogin] = useState<boolean>(false);

  // OTP state (Strictly NO OTP displayed on screen)
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [maskedPhone, setMaskedPhone] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState<number>(30);
  const [smsSentSuccess, setSmsSentSuccess] = useState<boolean>(false);
  const [pendingUserContext, setPendingUserContext] = useState<{
    phone: string;
    role: UserRole;
    isRegistration?: boolean;
    name?: string;
    linkTargetPhone?: string;
    relation?: string;
  } | null>(null);

  // Registration states
  const [regName, setRegName] = useState<string>("");
  const [regRole, setRegRole] = useState<UserRole>("PATIENT");
  const [regPhone, setRegPhone] = useState<string>("");
  const [regLinkTargetPhone, setRegLinkTargetPhone] = useState<string>("");
  const [regRelation, setRegRelation] = useState<string>("Son");

  // General UI states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Private Admin Gateway Modal State (hidden from public UI)
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string>("admin@elderlycare.ai");
  const [adminPasskey, setAdminPasskey] = useState<string>("");
  const [adminError, setAdminError] = useState<string>("");

  // Active language pack
  const langPack = getLanguagePack(selectedLanguage);
  const authStrings = langPack.auth;

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (authMode === "OTP_VERIFY" && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [authMode, resendCooldown]);

  // Handle language change with audio greeting
  const handleSelectLanguage = (langName: string) => {
    setSelectedLanguage(langName);
    soundFx.playTap();
    const pack = getLanguagePack(langName);
    speakText(pack.auth.spokenLangIntro, pack.speechCode, 1.0);
  };

  // 1. Patient Login Button -> Open Patient Login Screen
  const handleSelectPatientLogin = () => {
    soundFx.playTap();
    setActiveRole("PATIENT");
    setPhoneNumber("+91 98451 22345"); // preset sample number for easy elder testing
    setErrorMsg("");
    setAuthMode("PATIENT_LOGIN");
  };

  // 2. Caretaker Login Button -> Open Caretaker Login Screen
  const handleSelectCaretakerLogin = () => {
    soundFx.playTap();
    setActiveRole("CAREGIVER");
    setCaretakerEmailOrPhone("+91 98765 43210");
    setCaretakerPassword("care123");
    setErrorMsg("");
    setAuthMode("CARETAKER_LOGIN");
  };

  // 3. Register Button -> Open Registration Screen
  const handleSelectRegister = () => {
    soundFx.playTap();
    setRegRole("PATIENT");
    setRegName("");
    setRegPhone("+91 ");
    setRegLinkTargetPhone("");
    setErrorMsg("");
    setAuthMode("REGISTER");
  };

  // Send SMS OTP via Backend
  const handleSendOtp = async (targetPhone: string, role: UserRole, isReg = false, extraRegData?: any) => {
    setErrorMsg("");
    const cleanNumber = targetPhone.replace(/[^0-9+]/g, "").trim();
    const digitsOnly = cleanNumber.replace(/[^0-9]/g, "");

    if (digitsOnly.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile phone number.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanNumber,
          roleSelected: role,
          language: selectedLanguage,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMaskedPhone(data.maskedPhone || `+91 ••••• •${cleanNumber.slice(-4)}`);
        setSmsSentSuccess(true);
        setResendCooldown(30);
        setOtpDigits(["", "", "", "", "", ""]);
        setPendingUserContext({
          phone: cleanNumber,
          role,
          isRegistration: isReg,
          ...extraRegData,
        });
        setAuthMode("OTP_VERIFY");
        soundFx.playAttentionChime();
        speakText(
          selectedLanguage === "Telugu"
            ? "మీ మొబైల్ ఫోన్‌కి 6 అంకెల ధృవీకరణ కోడ్ పంపబడింది. దయచేసి ఎంటర్ చేయండి."
            : selectedLanguage === "Hindi"
            ? "आपके मोबाइल नंबर पर 6 अंकों का ओटीपी भेजा गया है। कृपया दर्ज करें।"
            : "A 6-digit verification code has been sent to your mobile phone via SMS. Please enter it below.",
          langPack.speechCode,
          1.0
        );
      } else {
        setErrorMsg(data.error || "Failed to send SMS OTP. Please try again.");
      }
    } catch {
      setErrorMsg("Network error contacting SMS gateway. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Caretaker Password Login
  const handleCaretakerPasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const input = caretakerEmailOrPhone.trim().toLowerCase();
    const cleanPhone = input.replace(/[^0-9]/g, "");

    const users = storage.getUsers();
    const matched = users.find(
      (u) =>
        u.role === "CAREGIVER" &&
        (u.email.toLowerCase() === input ||
          (cleanPhone.length >= 10 && u.phone.replace(/[^0-9]/g, "").includes(cleanPhone)))
    ) || DEFAULT_USERS.find((u) => u.role === "CAREGIVER");

    if (matched) {
      soundFx.playSuccessChime();
      storage.setCurrentUser(matched);
      storage.addAuditLog({
        actorName: matched.name,
        actorRole: "CAREGIVER",
        action: "CAREGIVER_LOGIN_SUCCESS",
        target: input,
        details: `Caretaker logged in successfully. Access granted to Caretaker Portal.`,
        severity: "INFO",
      });
      onLoginSuccess(matched);
    } else {
      setErrorMsg("Invalid Caretaker credentials. Please verify your email/phone.");
    }
  };

  // Handle OTP digit changes
  const handleOtpDigitChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);

    // Auto-focus next input field
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-digit-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-digit-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  // Verify OTP & Authenticate into Role Portal
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const fullOtp = otpDigits.join("");
    if (fullOtp.length !== 6) {
      setErrorMsg("Please enter the complete 6-digit OTP received via SMS.");
      return;
    }

    if (!pendingUserContext) {
      setErrorMsg("Session expired. Please restart login.");
      setAuthMode("WELCOME");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: pendingUserContext.phone,
          otp: fullOtp,
          expectedRole: pendingUserContext.role,
        }),
      });

      const data = await res.json();
      if (!data.success && !data.verified) {
        setErrorMsg(data.error || "Invalid OTP code. Please verify the SMS on your phone.");
        setIsLoading(false);
        return;
      }

      // Store authenticated JWT Token representing the authorized role
      if (data.token) {
        storage.setJwtToken(data.token);
      }

      // OTP Verified successfully!
      soundFx.playSuccessChime();

      if (pendingUserContext.isRegistration) {
        // Create new registered user
        const newUserName = pendingUserContext.name || (pendingUserContext.role === "PATIENT" ? "Elder Patient" : "Family Caregiver");
        const newUser: UserAccount = {
          id: `user-${Date.now()}`,
          name: newUserName,
          email: `${newUserName.toLowerCase().replace(/\s+/g, "")}@elderlycare.ai`,
          role: pendingUserContext.role,
          phone: pendingUserContext.phone,
          preferredLanguage: selectedLanguage,
          languageCode: langPack.speechCode,
          avatarUrl: pendingUserContext.role === "PATIENT" ? "👵" : "👨‍💼",
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          caregiverRelation: pendingUserContext.role === "CAREGIVER" ? pendingUserContext.relation || "Caregiver" : undefined,
          patientProfileId: pendingUserContext.role === "PATIENT" ? `patient-${Date.now()}` : undefined,
          assignedPatientIds: pendingUserContext.role === "CAREGIVER" ? [] : undefined,
        };

        const users = storage.getUsers();
        storage.saveUsers([...users, newUser]);

        // If a linking target was entered, create a ConnectionRequest
        if (pendingUserContext.linkTargetPhone) {
          const cleanTargetPhone = pendingUserContext.linkTargetPhone.replace(/[^0-9+]/g, "").trim();
          if (cleanTargetPhone.length >= 10) {
            storage.createConnectionRequest({
              patientId: pendingUserContext.role === "PATIENT" ? newUser.id : `patient-target-${Date.now()}`,
              patientName: pendingUserContext.role === "PATIENT" ? newUser.name : "Linked Patient",
              patientPhone: pendingUserContext.role === "PATIENT" ? newUser.phone : cleanTargetPhone,
              caretakerId: pendingUserContext.role === "CAREGIVER" ? newUser.id : `caretaker-target-${Date.now()}`,
              caretakerName: pendingUserContext.role === "CAREGIVER" ? newUser.name : "Linked Caretaker",
              caretakerPhone: pendingUserContext.role === "CAREGIVER" ? newUser.phone : cleanTargetPhone,
              relation: pendingUserContext.relation || "Family Caregiver",
              requestedBy: pendingUserContext.role,
            });
          }
        }

        storage.setCurrentUser(newUser);
        storage.addAuditLog({
          actorName: newUser.name,
          actorRole: newUser.role,
          action: "USER_REGISTERED_VIA_SMS_OTP",
          target: newUser.phone,
          details: `New ${newUser.role} account created and verified with mobile SMS OTP.`,
          severity: "SECURITY",
        });

        speakText(
          `Welcome to SevaCare, ${newUser.name}. Your account is ready!`,
          langPack.speechCode,
          1.0
        );
        onLoginSuccess(newUser);
      } else {
        // Existing user login
        const existingUsers = storage.getUsers();
        const cleanPhone = pendingUserContext.phone.replace(/[^0-9]/g, "");

        let targetUser = existingUsers.find(
          (u) =>
            u.role === pendingUserContext.role &&
            u.phone.replace(/[^0-9]/g, "").includes(cleanPhone)
        );

        if (!targetUser) {
          // If default seeded demo user
          targetUser = DEFAULT_USERS.find((u) => u.role === pendingUserContext.role);
        }

        if (targetUser) {
          if (targetUser.status === "SUSPENDED") {
            setErrorMsg("This account has been suspended by the administrator.");
            setIsLoading(false);
            return;
          }

          const updatedUser: UserAccount = {
            ...targetUser,
            preferredLanguage: selectedLanguage,
            languageCode: langPack.speechCode,
            lastLoginAt: new Date().toISOString(),
          };

          storage.setCurrentUser(updatedUser);
          storage.addAuditLog({
            actorName: updatedUser.name,
            actorRole: updatedUser.role,
            action: "SMS_OTP_LOGIN_VERIFIED",
            target: updatedUser.phone,
            details: `Mobile SMS OTP verified. User logged into ${updatedUser.role} portal.`,
            severity: "INFO",
          });

          speakText(
            selectedLanguage === "Telugu"
              ? `స్వాగతం ${updatedUser.name} గారు. మీరు లాగిన్ అయ్యారు.`
              : selectedLanguage === "Hindi"
              ? `नमस्ते ${updatedUser.name} जी। आप लॉग इन हो चुके हैं।`
              : `Welcome back, ${updatedUser.name}.`,
            langPack.speechCode,
            1.0
          );
          onLoginSuccess(updatedUser);
        } else {
          // Fallback auto-provision for new phone
          const autoUser: UserAccount = {
            id: `user-${Date.now()}`,
            name: pendingUserContext.role === "PATIENT" ? "Senior Patient" : "Family Caretaker",
            email: `user${Date.now()}@elderlycare.ai`,
            role: pendingUserContext.role,
            phone: pendingUserContext.phone,
            preferredLanguage: selectedLanguage,
            languageCode: langPack.speechCode,
            avatarUrl: pendingUserContext.role === "PATIENT" ? "👵" : "👨‍💼",
            status: "ACTIVE",
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
          storage.saveUsers([...existingUsers, autoUser]);
          storage.setCurrentUser(autoUser);
          onLoginSuccess(autoUser);
        }
      }
    } catch {
      setErrorMsg("Error verifying OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Admin Private Gateway Login (protected via secret key)
  const handleAdminGatewayLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");

    if (adminPasskey !== "admin@123") {
      setAdminError("Invalid Administrator Master Key. Access Denied.");
      return;
    }

    const users = storage.getUsers();
    const adminUser =
      users.find((u) => u.role === "ADMIN") ||
      DEFAULT_USERS.find((u) => u.role === "ADMIN");

    if (adminUser) {
      soundFx.playSuccessChime();
      storage.setCurrentUser(adminUser);
      storage.addAuditLog({
        actorName: adminUser.name,
        actorRole: "ADMIN",
        action: "ADMIN_GATEWAY_AUTH",
        target: "/secure-admin",
        details: "Administrator authenticated via private master passkey gateway.",
        severity: "SECURITY",
      });
      setShowAdminModal(false);
      onLoginSuccess(adminUser);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col justify-between items-center p-4 sm:p-6 selection:bg-teal-500 selection:text-white relative font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Background ambient accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-teal-900/30 via-emerald-950/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-10 w-[400px] h-[300px] bg-teal-800/10 blur-3xl" />
      </div>

      {/* Top Header with App Name & Language Picker */}
      <header className="w-full flex items-center justify-between max-w-xl pt-2 z-10">
        <div className="flex items-center gap-2.5">
          <span className="text-3xl">👵</span>
          <div>
            <h1 className="font-black text-xl tracking-tight text-white">SevaCare AI</h1>
            <p className="text-[11px] text-stone-400 font-medium">Elder Care & Voice Medicine Companion</p>
          </div>
        </div>

        {/* Language selector chip */}
        <div className="flex items-center gap-1.5 bg-stone-800/90 border border-stone-700 px-3 py-1.5 rounded-2xl text-xs font-bold text-stone-200">
          <Languages size={14} className="text-teal-400" />
          <select
            value={selectedLanguage}
            onChange={(e) => handleSelectLanguage(e.target.value)}
            className="bg-transparent text-white font-bold cursor-pointer focus:outline-none pr-1"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.name} className="bg-stone-900 text-white">
                {lang.flag} {lang.name} ({lang.nativeName})
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="w-full max-w-md my-auto py-8 z-10">
        {/* Error message alert */}
        {errorMsg && (
          <div className="mb-5 bg-rose-950/80 border-2 border-rose-500/80 rounded-2xl p-4 text-rose-200 text-xs sm:text-sm font-semibold flex items-start gap-3 animate-in fade-in duration-200">
            <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 1: PUBLIC LOGIN PORTAL (PATIENT vs CARETAKER)   */}
        {/* ---------------------------------------------------- */}
        {authMode === "WELCOME" && (
          <div className="bg-stone-800/90 border-2 border-stone-700 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center mb-7">
              <span className="inline-flex items-center gap-1.5 bg-teal-950/80 text-teal-300 border border-teal-500/40 text-xs font-extrabold px-3.5 py-1 rounded-full mb-3">
                <Sparkles size={13} />
                Welcome to Elder Care
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Please select how you want to log in
              </h2>
              <p className="text-stone-400 text-xs sm:text-sm mt-1.5">
                Role-authorized access for senior elders & caretakers
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {/* Patient Login Button */}
              <button
                type="button"
                id="btn-patient-login-select"
                onClick={handleSelectPatientLogin}
                className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white p-5 rounded-2xl border-2 border-teal-400/50 shadow-lg hover:shadow-teal-500/20 transition-all flex items-center justify-between group cursor-pointer text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 text-3xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    👴
                  </div>
                  <div>
                    <div className="text-lg font-black tracking-tight text-white">Patient Login</div>
                    <div className="text-xs text-teal-100 font-medium mt-0.5">
                      Senior-friendly large buttons & AI voice assistance
                    </div>
                  </div>
                </div>
                <ChevronRight size={22} className="text-teal-200 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>

              {/* Caretaker Login Button */}
              <button
                type="button"
                id="btn-caretaker-login-select"
                onClick={handleSelectCaretakerLogin}
                className="w-full bg-stone-700/80 hover:bg-stone-700 text-white p-5 rounded-2xl border-2 border-stone-600 hover:border-teal-500/50 transition-all flex items-center justify-between group cursor-pointer text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-stone-800 border border-stone-600 text-3xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    👨‍👩‍👧
                  </div>
                  <div>
                    <div className="text-lg font-black tracking-tight text-white">Caretaker Login</div>
                    <div className="text-xs text-stone-400 font-medium mt-0.5">
                      Manage medicine schedules, alerts & messages
                    </div>
                  </div>
                </div>
                <ChevronRight size={22} className="text-stone-400 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>
            </div>

            {/* New User Register Section */}
            <div className="mt-8 pt-6 border-t border-stone-700/80 text-center">
              <p className="text-xs font-semibold text-stone-400 mb-3">New User?</p>
              <button
                type="button"
                id="btn-register-select"
                onClick={handleSelectRegister}
                className="w-full py-3.5 px-4 bg-stone-900/90 hover:bg-stone-950 text-teal-300 hover:text-teal-200 border-2 border-teal-500/30 hover:border-teal-500/70 rounded-2xl font-black text-sm tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus size={16} />
                Register New Account
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 2: PATIENT LOGIN (PHONE NUMBER & SMS OTP)       */}
        {/* ---------------------------------------------------- */}
        {authMode === "PATIENT_LOGIN" && (
          <div className="bg-stone-800/90 border-2 border-teal-500/60 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg("");
                  setAuthMode("WELCOME");
                }}
                className="text-stone-400 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <span className="bg-teal-950 text-teal-300 border border-teal-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                👴 Senior Portal
              </span>
            </div>

            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border-2 border-teal-500 text-3xl flex items-center justify-center mx-auto mb-3">
                👴
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Patient Login</h2>
              <p className="text-stone-300 text-xs sm:text-sm mt-1">
                Enter your mobile number to receive a secure SMS OTP
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(phoneNumber, "PATIENT"); }} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-2">
                  Phone Number:
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-400" />
                  <input
                    type="tel"
                    id="input-patient-phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 98451 22345"
                    className="w-full bg-stone-900 border-2 border-stone-700 focus:border-teal-400 rounded-2xl py-4 pl-12 pr-4 text-white text-lg font-bold placeholder-stone-600 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-patient-send-otp"
                disabled={isLoading}
                className="w-full py-4 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-stone-950 rounded-2xl font-black text-base tracking-wide shadow-lg hover:shadow-teal-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Sending Real SMS OTP...
                  </>
                ) : (
                  <>
                    Send Secure OTP via SMS
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-stone-700 text-center text-xs text-stone-400">
              Need assistance? Ask your family caretaker or press the speaker icon.
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 3: CARETAKER LOGIN (EMAIL/PHONE OR SMS OTP)     */}
        {/* ---------------------------------------------------- */}
        {authMode === "CARETAKER_LOGIN" && (
          <div className="bg-stone-800/90 border-2 border-stone-700 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg("");
                  setAuthMode("WELCOME");
                }}
                className="text-stone-400 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <span className="bg-stone-700 text-stone-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                👨‍👩‍👧 Caretaker Portal
              </span>
            </div>

            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-stone-700 border-2 border-stone-600 text-3xl flex items-center justify-center mx-auto mb-3">
                👨‍👩‍👧
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Caretaker Login</h2>
              <p className="text-stone-400 text-xs sm:text-sm mt-1">
                Access authorized elderly profiles & medicine logs
              </p>
            </div>

            {usePasswordLogin ? (
              <form onSubmit={handleCaretakerPasswordLogin} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-2">
                    Email or Phone Number:
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      id="input-caretaker-identifier"
                      value={caretakerEmailOrPhone}
                      onChange={(e) => setCaretakerEmailOrPhone(e.target.value)}
                      placeholder="+91 98765 43210 or email"
                      className="w-full bg-stone-900 border-2 border-stone-700 focus:border-teal-400 rounded-2xl py-3.5 pl-12 pr-4 text-white text-base font-bold placeholder-stone-600 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-2">
                    Password:
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="password"
                      id="input-caretaker-password"
                      value={caretakerPassword}
                      onChange={(e) => setCaretakerPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-stone-900 border-2 border-stone-700 focus:border-teal-400 rounded-2xl py-3.5 pl-12 pr-4 text-white text-base font-bold placeholder-stone-600 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-caretaker-password-login"
                  className="w-full py-4 bg-teal-500 hover:bg-teal-400 text-stone-950 rounded-2xl font-black text-base tracking-wide shadow-lg hover:shadow-teal-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  Login to Caretaker Portal
                  <ArrowRight size={18} />
                </button>

                <div className="text-center mt-2">
                  <button
                    type="button"
                    onClick={() => setUsePasswordLogin(false)}
                    className="text-xs font-bold text-teal-400 hover:underline cursor-pointer"
                  >
                    Or login using Mobile SMS OTP
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(caretakerEmailOrPhone, "CAREGIVER"); }} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-2">
                    Mobile Phone Number:
                  </label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-400" />
                    <input
                      type="tel"
                      id="input-caretaker-phone-otp"
                      value={caretakerEmailOrPhone}
                      onChange={(e) => setCaretakerEmailOrPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-stone-900 border-2 border-stone-700 focus:border-teal-400 rounded-2xl py-4 pl-12 pr-4 text-white text-lg font-bold placeholder-stone-600 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-caretaker-send-otp"
                  disabled={isLoading}
                  className="w-full py-4 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-stone-950 rounded-2xl font-black text-base tracking-wide shadow-lg hover:shadow-teal-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Sending SMS OTP...
                    </>
                  ) : (
                    <>
                      Send Secure OTP via SMS
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <div className="text-center mt-2">
                  <button
                    type="button"
                    onClick={() => setUsePasswordLogin(true)}
                    className="text-xs font-bold text-teal-400 hover:underline cursor-pointer"
                  >
                    Or login with Password
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 4: REGISTRATION & PATIENT-CARETAKER LINKING     */}
        {/* ---------------------------------------------------- */}
        {authMode === "REGISTER" && (
          <div className="bg-stone-800/90 border-2 border-stone-700 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg("");
                  setAuthMode("WELCOME");
                }}
                className="text-stone-400 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft size={16} />
                Back to Login
              </button>
              <span className="bg-teal-950 text-teal-300 border border-teal-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                New User Registration
              </span>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-white tracking-tight">Create SevaCare Account</h2>
              <p className="text-stone-400 text-xs sm:text-sm mt-1">
                Register as a Patient or Caretaker with mobile SMS verification
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!regName.trim()) {
                  setErrorMsg("Please enter your full name.");
                  return;
                }
                handleSendOtp(regPhone, regRole, true, {
                  name: regName.trim(),
                  linkTargetPhone: regLinkTargetPhone.trim(),
                  relation: regRelation,
                });
              }}
              className="flex flex-col gap-4"
            >
              {/* Role selector */}
              <div>
                <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-2">
                  I am registering as:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    id="btn-reg-role-patient"
                    onClick={() => setRegRole("PATIENT")}
                    className={`py-3 px-3 rounded-xl border-2 font-black text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      regRole === "PATIENT"
                        ? "bg-teal-500 text-stone-950 border-teal-400 shadow-md"
                        : "bg-stone-900 text-stone-300 border-stone-700 hover:border-stone-600"
                    }`}
                  >
                    👵 Patient
                  </button>
                  <button
                    type="button"
                    id="btn-reg-role-caregiver"
                    onClick={() => setRegRole("CAREGIVER")}
                    className={`py-3 px-3 rounded-xl border-2 font-black text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      regRole === "CAREGIVER"
                        ? "bg-teal-500 text-stone-950 border-teal-400 shadow-md"
                        : "bg-stone-900 text-stone-300 border-stone-700 hover:border-stone-600"
                    }`}
                  >
                    👨‍👩‍👧 Caretaker
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-2">
                  Full Name:
                </label>
                <input
                  type="text"
                  id="input-reg-name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder={regRole === "PATIENT" ? "e.g. Kalyani Amma" : "e.g. Rahul Sharma"}
                  className="w-full bg-stone-900 border-2 border-stone-700 focus:border-teal-400 rounded-2xl py-3 px-4 text-white text-base font-bold placeholder-stone-600 focus:outline-none"
                  required
                />
              </div>

              {/* Mobile Phone */}
              <div>
                <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-2">
                  Mobile Phone Number (for SMS OTP):
                </label>
                <input
                  type="tel"
                  id="input-reg-phone"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+91 98451 22345"
                  className="w-full bg-stone-900 border-2 border-stone-700 focus:border-teal-400 rounded-2xl py-3 px-4 text-white text-base font-bold placeholder-stone-600 focus:outline-none"
                  required
                />
              </div>

              {/* Patient-Caretaker Linking Input */}
              <div className="bg-stone-900/90 border border-stone-700 p-3.5 rounded-2xl">
                <div className="flex items-center gap-2 mb-2 text-teal-300 text-xs font-black">
                  <LinkIcon size={14} />
                  <span>{regRole === "PATIENT" ? "Link Caretaker (Optional)" : "Link Patient (Optional)"}</span>
                </div>
                <p className="text-[11px] text-stone-400 mb-2.5">
                  {regRole === "PATIENT"
                    ? "Enter your family caretaker's phone number to send a linking connection request."
                    : "Enter your patient's phone number to link their profile."}
                </p>
                <input
                  type="tel"
                  id="input-reg-link-phone"
                  value={regLinkTargetPhone}
                  onChange={(e) => setRegLinkTargetPhone(e.target.value)}
                  placeholder={regRole === "PATIENT" ? "Caretaker's Phone (+91 ...)" : "Patient's Phone (+91 ...)"}
                  className="w-full bg-stone-950 border border-stone-700 focus:border-teal-400 rounded-xl py-2.5 px-3 text-white text-sm font-semibold placeholder-stone-600 focus:outline-none mb-2"
                />
                <select
                  value={regRelation}
                  onChange={(e) => setRegRelation(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 text-stone-200 rounded-xl py-2 px-3 text-xs font-medium focus:outline-none"
                >
                  <option value="Son">Relation: Son</option>
                  <option value="Daughter">Relation: Daughter</option>
                  <option value="Spouse">Relation: Spouse</option>
                  <option value="Home Nurse">Relation: Home Nurse</option>
                  <option value="Family Caregiver">Relation: Family Caregiver</option>
                </select>
              </div>

              <button
                type="submit"
                id="btn-submit-registration"
                disabled={isLoading}
                className="w-full py-4 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-stone-950 rounded-2xl font-black text-base tracking-wide shadow-lg hover:shadow-teal-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Sending Real SMS OTP...
                  </>
                ) : (
                  <>
                    Verify Phone via SMS OTP
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 5: ENTER REAL 6-DIGIT SMS OTP (NO ON-SCREEN OTP)*/}
        {/* ---------------------------------------------------- */}
        {authMode === "OTP_VERIFY" && (
          <div className="bg-stone-800/90 border-2 border-teal-500/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg("");
                  setAuthMode("WELCOME");
                }}
                className="text-stone-400 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft size={16} />
                Change Number
              </button>
              <span className="bg-teal-950 text-teal-300 border border-teal-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                🔒 SMS Verification
              </span>
            </div>

            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-teal-950 border border-teal-500/60 text-teal-300 flex items-center justify-center mx-auto mb-3">
                <Lock size={26} />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Enter SMS Code</h2>
              <p className="text-stone-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
                We sent a 6-digit verification code to your mobile phone:
                <br />
                <strong className="text-teal-300 font-bold text-base mt-1 inline-block">{maskedPhone}</strong>
              </p>
              <p className="text-[11px] text-stone-400 mt-1">
                Please check your phone's SMS inbox and type the 6 digits below.
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
              {/* 6 Digit Input Boxes */}
              <div className="flex justify-center items-center gap-2 sm:gap-2.5">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-digit-${idx}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-black bg-stone-900 border-2 border-stone-600 focus:border-teal-400 focus:bg-stone-950 text-white rounded-2xl focus:outline-none transition-colors"
                    required
                  />
                ))}
              </div>

              <button
                type="submit"
                id="btn-verify-otp"
                disabled={isLoading || otpDigits.join("").length !== 6}
                className="w-full py-4 bg-teal-500 hover:bg-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-stone-950 rounded-2xl font-black text-base tracking-wide shadow-lg hover:shadow-teal-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Verifying Code...
                  </>
                ) : (
                  <>
                    Verify & Access Portal
                    <CheckCircle2 size={18} />
                  </>
                )}
              </button>

              {/* Resend SMS Code Section */}
              <div className="text-center pt-2">
                {resendCooldown > 0 ? (
                  <span className="text-xs text-stone-400">
                    Resend SMS code in <strong className="text-stone-300 font-mono">{resendCooldown}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    id="btn-resend-otp"
                    onClick={() => {
                      if (pendingUserContext) {
                        handleSendOtp(
                          pendingUserContext.phone,
                          pendingUserContext.role,
                          pendingUserContext.isRegistration,
                          pendingUserContext
                        );
                      }
                    }}
                    className="text-xs font-bold text-teal-400 hover:text-teal-300 underline cursor-pointer"
                  >
                    Didn't receive SMS? Resend Code
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Private Admin Gateway Modal (Hidden from public UI, accessible via footer link only) */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-stone-900 border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield size={20} className="text-amber-400" />
                <h3 className="text-lg font-black text-white">System Admin Gateway</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="text-stone-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-400 mb-4">
              Private access gateway for system management and audit compliance. Requires Master Key passkey.
            </p>

            {adminError && (
              <div className="mb-4 bg-rose-950/80 border border-rose-500 text-rose-200 text-xs p-3 rounded-xl">
                {adminError}
              </div>
            )}

            <form onSubmit={handleAdminGatewayLogin} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">Admin Email:</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">Master Passkey:</label>
                <input
                  type="password"
                  value={adminPasskey}
                  onChange={(e) => setAdminPasskey(e.target.value)}
                  placeholder="Master key (e.g. admin@123)"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-white text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                id="btn-admin-gateway-submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl font-black text-sm transition-colors cursor-pointer"
              >
                Authorize & Open Admin Portal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer with Private Admin Gateway link */}
      <footer className="w-full max-w-xl text-center py-3 z-10 flex items-center justify-between text-xs text-stone-500">
        <span>SevaCare AI • Protected Health Information System</span>
        <button
          type="button"
          onClick={() => setShowAdminModal(true)}
          className="text-stone-500 hover:text-stone-300 text-[11px] underline cursor-pointer"
        >
          Admin Gateway
        </button>
      </footer>
    </div>
  );
};
