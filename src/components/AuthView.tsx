import React, { useState } from "react";
import { UserAccount, UserRole, SUPPORTED_LANGUAGES } from "../types";
import { storage, DEFAULT_USERS } from "../utils/storage";
import { soundFx, speakText } from "../utils/audio";
import { getLanguagePack } from "../utils/i18n";
import {
  Phone,
  Languages,
  Lock,
  ArrowRight,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  Mail,
  UserPlus,
  Link as LinkIcon,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

interface AuthViewProps {
  onLoginSuccess: (user: UserAccount) => void;
}

type AuthMode = "WELCOME" | "PATIENT_LOGIN" | "CARETAKER_LOGIN" | "REGISTER";

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess }) => {
  // Navigation mode
  const [authMode, setAuthMode] = useState<AuthMode>("WELCOME");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("English");
  const [, setActiveRole] = useState<UserRole>("PATIENT");

  // Form states - Patient Login
  const [patientPhone, setPatientPhone] = useState<string>("+91 98451 22345");
  const [patientPassword, setPatientPassword] = useState<string>("elder123");
  const [showPatientPassword, setShowPatientPassword] = useState<boolean>(false);

  // Form states - Caretaker Login
  const [caretakerIdentifier, setCaretakerIdentifier] = useState<string>("+91 98765 43210");
  const [caretakerPassword, setCaretakerPassword] = useState<string>("care123");
  const [showCaretakerPassword, setShowCaretakerPassword] = useState<boolean>(false);

  // Form states - Registration
  const [regName, setRegName] = useState<string>("");
  const [regRole, setRegRole] = useState<UserRole>("PATIENT");
  const [regPhone, setRegPhone] = useState<string>("+91 ");
  const [regEmail, setRegEmail] = useState<string>("");
  const [regPassword, setRegPassword] = useState<string>("");
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>("");
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);
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
    setPatientPhone("+91 98451 22345");
    setPatientPassword("elder123");
    setErrorMsg("");
    setAuthMode("PATIENT_LOGIN");
  };

  // 2. Caretaker Login Button -> Open Caretaker Login Screen
  const handleSelectCaretakerLogin = () => {
    soundFx.playTap();
    setActiveRole("CAREGIVER");
    setCaretakerIdentifier("+91 98765 43210");
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
    setRegEmail("");
    setRegPassword("");
    setRegConfirmPassword("");
    setRegLinkTargetPhone("");
    setErrorMsg("");
    setAuthMode("REGISTER");
  };

  // ----------------------------------------------------
  // SUBMIT: PATIENT PASSWORD LOGIN
  // ----------------------------------------------------
  const handlePatientPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!patientPhone.trim()) {
      setErrorMsg("Please enter your mobile phone number.");
      return;
    }
    if (!patientPassword.trim()) {
      setErrorMsg("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Try local storage authenticateUser
      const authResult = storage.authenticateUser(patientPhone, patientPassword, "PATIENT");

      if (!authResult.success || !authResult.user) {
        // If not found in storage, try backend API
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identifier: patientPhone,
            password: patientPassword,
            role: "PATIENT",
          }),
        });
        const data = await res.json();

        if (!data.success) {
          setErrorMsg(authResult.error || data.error || "Invalid mobile number or password. Please try again.");
          setIsLoading(false);
          return;
        }

        if (data.token) {
          storage.setJwtToken(data.token);
        }
      }

      const user = authResult.user || DEFAULT_USERS.find((u) => u.role === "PATIENT")!;
      const updatedUser: UserAccount = {
        ...user,
        preferredLanguage: selectedLanguage,
        languageCode: langPack.speechCode,
        lastLoginAt: new Date().toISOString(),
      };

      storage.setCurrentUser(updatedUser);
      storage.addAuditLog({
        actorName: updatedUser.name,
        actorRole: "PATIENT",
        action: "PASSWORD_LOGIN_SUCCESS",
        target: updatedUser.phone,
        details: "Patient logged in successfully with password.",
        severity: "INFO",
      });

      soundFx.playSuccessChime();
      speakText(
        selectedLanguage === "Telugu"
          ? `స్వాగతం ${updatedUser.name} గారు. మీరు విజయవంతంగా లాగిన్ అయ్యారు.`
          : selectedLanguage === "Hindi"
          ? `नमस्ते ${updatedUser.name} जी। आपका स्वागत है।`
          : `Welcome back, ${updatedUser.name}.`,
        langPack.speechCode,
        1.0
      );

      onLoginSuccess(updatedUser);
    } catch {
      setErrorMsg("Unable to complete login. Please verify your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------
  // SUBMIT: CARETAKER PASSWORD LOGIN
  // ----------------------------------------------------
  const handleCaretakerPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!caretakerIdentifier.trim()) {
      setErrorMsg("Please enter your email address or mobile phone number.");
      return;
    }
    if (!caretakerPassword.trim()) {
      setErrorMsg("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      const authResult = storage.authenticateUser(caretakerIdentifier, caretakerPassword, "CAREGIVER");

      if (!authResult.success || !authResult.user) {
        // Attempt backend endpoint fallback
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identifier: caretakerIdentifier,
            password: caretakerPassword,
            role: "CAREGIVER",
          }),
        });
        const data = await res.json();

        if (!data.success) {
          setErrorMsg(authResult.error || data.error || "Invalid Caretaker credentials. Please verify your email/phone and password.");
          setIsLoading(false);
          return;
        }

        if (data.token) {
          storage.setJwtToken(data.token);
        }
      }

      const user = authResult.user || DEFAULT_USERS.find((u) => u.role === "CAREGIVER")!;
      const updatedUser: UserAccount = {
        ...user,
        lastLoginAt: new Date().toISOString(),
      };

      storage.setCurrentUser(updatedUser);
      storage.addAuditLog({
        actorName: updatedUser.name,
        actorRole: "CAREGIVER",
        action: "CAREGIVER_LOGIN_SUCCESS",
        target: caretakerIdentifier,
        details: "Caretaker logged in successfully with password.",
        severity: "INFO",
      });

      soundFx.playSuccessChime();
      speakText(`Welcome back, ${updatedUser.name}. Caretaker portal ready.`, "en-US", 1.0);
      onLoginSuccess(updatedUser);
    } catch {
      setErrorMsg("Unable to complete login. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------
  // SUBMIT: NEW USER REGISTRATION (PASSWORD-BASED)
  // ----------------------------------------------------
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!regName.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    const cleanPhone = regPhone.replace(/[^0-9+]/g, "").trim();
    if (cleanPhone.replace(/[^0-9]/g, "").length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile phone number.");
      return;
    }
    if (!regPassword || regPassword.length < 4) {
      setErrorMsg("Please enter a secure password (minimum 4 characters).");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter.");
      return;
    }

    setIsLoading(true);

    try {
      const newUserName = regName.trim();
      const generatedEmail = regEmail.trim() || `${newUserName.toLowerCase().replace(/\s+/g, "")}@elderlycare.ai`;

      // Call registration API
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newUserName,
            email: generatedEmail,
            phone: cleanPhone,
            password: regPassword,
            role: regRole,
            preferredLanguage: selectedLanguage,
          }),
        });
        const data = await res.json();
        if (data.token) {
          storage.setJwtToken(data.token);
        }
      } catch (err) {
        console.warn("Backend register notice:", err);
      }

      // Create new user in local state
      const newUser: UserAccount = {
        id: `user-${Date.now()}`,
        name: newUserName,
        email: generatedEmail,
        password: regPassword,
        role: regRole,
        phone: cleanPhone,
        preferredLanguage: selectedLanguage,
        languageCode: langPack.speechCode,
        avatarUrl: regRole === "PATIENT" ? "👵" : "👨‍💼",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        caregiverRelation: regRole === "CAREGIVER" ? regRelation || "Caregiver" : undefined,
        patientProfileId: regRole === "PATIENT" ? `patient-${Date.now()}` : undefined,
        assignedPatientIds: regRole === "CAREGIVER" ? [] : undefined,
      };

      const existingUsers = storage.getUsers();
      storage.saveUsers([...existingUsers, newUser]);

      // If linking phone is entered, create Connection Request
      if (regLinkTargetPhone.trim()) {
        const cleanTargetPhone = regLinkTargetPhone.replace(/[^0-9+]/g, "").trim();
        if (cleanTargetPhone.replace(/[^0-9]/g, "").length >= 10) {
          storage.createConnectionRequest({
            patientId: regRole === "PATIENT" ? newUser.id : `patient-target-${Date.now()}`,
            patientName: regRole === "PATIENT" ? newUser.name : "Linked Patient",
            patientPhone: regRole === "PATIENT" ? newUser.phone : cleanTargetPhone,
            caretakerId: regRole === "CAREGIVER" ? newUser.id : `caretaker-target-${Date.now()}`,
            caretakerName: regRole === "CAREGIVER" ? newUser.name : "Linked Caretaker",
            caretakerPhone: regRole === "CAREGIVER" ? newUser.phone : cleanTargetPhone,
            relation: regRelation || "Family Caregiver",
            requestedBy: regRole,
          });
        }
      }

      storage.setCurrentUser(newUser);
      storage.addAuditLog({
        actorName: newUser.name,
        actorRole: newUser.role,
        action: "USER_REGISTERED_PASSWORD_AUTH",
        target: newUser.phone,
        details: `New ${newUser.role} account registered with password-based authentication.`,
        severity: "SECURITY",
      });

      soundFx.playSuccessChime();
      speakText(`Welcome to SevaCare, ${newUser.name}. Your account is ready!`, langPack.speechCode, 1.0);
      onLoginSuccess(newUser);
    } catch {
      setErrorMsg("Failed to complete registration. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------
  // SUBMIT: ADMIN GATEWAY
  // ----------------------------------------------------
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
      {/* Ambient background accents */}
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

        {/* Language selector */}
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
        {/* STEP 1: WELCOME SCREEN (ROLE SELECTION)              */}
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
                Password-secured access for senior elders & caretakers
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
                    👵
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
        {/* STEP 2: PATIENT LOGIN (PHONE & PASSWORD)             */}
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
                👵 Senior Patient Portal
              </span>
            </div>

            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border-2 border-teal-500 text-3xl flex items-center justify-center mx-auto mb-3">
                👵
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Patient Login</h2>
              <p className="text-stone-300 text-xs sm:text-sm mt-1">
                Enter your mobile number and password to access your daily medicine care
              </p>
            </div>

            <form onSubmit={handlePatientPasswordLogin} className="flex flex-col gap-4">
              {/* Phone Input */}
              <div>
                <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-2">
                  Mobile Phone Number:
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-400" />
                  <input
                    type="tel"
                    id="input-patient-phone"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="+91 98451 22345"
                    className="w-full bg-stone-900 border-2 border-stone-700 focus:border-teal-400 rounded-2xl py-3.5 pl-12 pr-4 text-white text-base font-bold placeholder-stone-600 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black text-stone-300 uppercase tracking-wider">
                    Password / Security PIN:
                  </label>
                  <span className="text-[11px] text-teal-400/90 font-medium">Demo: elder123</span>
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-400" />
                  <input
                    type={showPatientPassword ? "text" : "password"}
                    id="input-patient-password"
                    value={patientPassword}
                    onChange={(e) => setPatientPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-stone-900 border-2 border-stone-700 focus:border-teal-400 rounded-2xl py-3.5 pl-12 pr-12 text-white text-base font-bold placeholder-stone-600 focus:outline-none transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPatientPassword(!showPatientPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white cursor-pointer"
                  >
                    {showPatientPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="btn-patient-login-submit"
                disabled={isLoading}
                className="w-full py-4 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-stone-950 rounded-2xl font-black text-base tracking-wide shadow-lg hover:shadow-teal-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    Login to Patient Portal
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-stone-700 text-center text-xs text-stone-400 flex items-center justify-center gap-1.5">
              <span>Don't have an account?</span>
              <button
                type="button"
                onClick={handleSelectRegister}
                className="text-teal-400 hover:underline font-bold cursor-pointer"
              >
                Register Here
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 3: CARETAKER LOGIN (EMAIL/PHONE & PASSWORD)     */}
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
                Access authorized elderly profiles, schedule medicines & view alerts
              </p>
            </div>

            <form onSubmit={handleCaretakerPasswordLogin} className="flex flex-col gap-4">
              {/* Identifier Input */}
              <div>
                <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-2">
                  Email or Phone Number:
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    id="input-caretaker-identifier"
                    value={caretakerIdentifier}
                    onChange={(e) => setCaretakerIdentifier(e.target.value)}
                    placeholder="+91 98765 43210 or caregiver@elderlycare.ai"
                    className="w-full bg-stone-900 border-2 border-stone-700 focus:border-teal-400 rounded-2xl py-3.5 pl-12 pr-4 text-white text-base font-bold placeholder-stone-600 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black text-stone-300 uppercase tracking-wider">
                    Password:
                  </label>
                  <span className="text-[11px] text-teal-400/90 font-medium">Demo: care123</span>
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type={showCaretakerPassword ? "text" : "password"}
                    id="input-caretaker-password"
                    value={caretakerPassword}
                    onChange={(e) => setCaretakerPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-stone-900 border-2 border-stone-700 focus:border-teal-400 rounded-2xl py-3.5 pl-12 pr-12 text-white text-base font-bold placeholder-stone-600 focus:outline-none transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCaretakerPassword(!showCaretakerPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white cursor-pointer"
                  >
                    {showCaretakerPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="btn-caretaker-password-login"
                disabled={isLoading}
                className="w-full py-4 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-stone-950 rounded-2xl font-black text-base tracking-wide shadow-lg hover:shadow-teal-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    Login to Caretaker Portal
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-stone-700 text-center text-xs text-stone-400 flex items-center justify-center gap-1.5">
              <span>New Caretaker?</span>
              <button
                type="button"
                onClick={handleSelectRegister}
                className="text-teal-400 hover:underline font-bold cursor-pointer"
              >
                Create Account
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* STEP 4: REGISTRATION (PASSWORD-BASED)                */}
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
                Register with a secure password for instant access
              </p>
            </div>

            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
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
                <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-1.5">
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
                <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-1.5">
                  Mobile Phone Number:
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

              {/* Email (Optional for Patient) */}
              <div>
                <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-1.5">
                  Email Address (Optional):
                </label>
                <input
                  type="email"
                  id="input-reg-email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="e.g. user@elderlycare.ai"
                  className="w-full bg-stone-900 border-2 border-stone-700 focus:border-teal-400 rounded-2xl py-3 px-4 text-white text-sm font-semibold placeholder-stone-600 focus:outline-none"
                />
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-1.5">
                    Password:
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? "text" : "password"}
                      id="input-reg-password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 4 chars"
                      className="w-full bg-stone-900 border-2 border-stone-700 focus:border-teal-400 rounded-2xl py-3 px-3.5 pr-10 text-white text-sm font-bold placeholder-stone-600 focus:outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-stone-300 uppercase tracking-wider mb-1.5">
                    Confirm Password:
                  </label>
                  <input
                    type={showRegPassword ? "text" : "password"}
                    id="input-reg-confirm-password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full bg-stone-900 border-2 border-stone-700 focus:border-teal-400 rounded-2xl py-3 px-3.5 text-white text-sm font-bold placeholder-stone-600 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Patient-Caretaker Linking Input */}
              <div className="bg-stone-900/90 border border-stone-700 p-3.5 rounded-2xl">
                <div className="flex items-center gap-2 mb-1.5 text-teal-300 text-xs font-black">
                  <LinkIcon size={14} />
                  <span>{regRole === "PATIENT" ? "Link Caretaker (Optional)" : "Link Patient (Optional)"}</span>
                </div>
                <p className="text-[11px] text-stone-400 mb-2">
                  {regRole === "PATIENT"
                    ? "Enter your family caretaker's phone number to automatically send a connection request."
                    : "Enter your senior patient's phone number to connect their profile."}
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
                className="w-full py-4 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-stone-950 rounded-2xl font-black text-base tracking-wide shadow-lg hover:shadow-teal-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account & Login
                    <CheckCircle2 size={18} />
                  </>
                )}
              </button>
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
                className="text-stone-400 hover:text-white text-sm font-bold cursor-pointer"
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
