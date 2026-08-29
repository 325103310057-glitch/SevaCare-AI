import React, { useState } from "react";
import { RoleMode, SUPPORTED_LANGUAGES, PatientProfile, UserAccount } from "../types";
import {
  Heart,
  Shield,
  Languages,
  RotateCcw,
  LogOut,
  Bell,
  UserCheck,
  Sparkles,
} from "lucide-react";
import { soundFx } from "../utils/audio";

interface HeaderProps {
  roleMode: RoleMode;
  onSelectRole: (role: RoleMode) => void;
  patient: PatientProfile;
  currentUser: UserAccount | null;
  onUpdateLanguage: (langName: string, langCode: string) => void;
  onResetData: () => void;
  onLogout: () => void;
  onSwitchUser: (user: UserAccount) => void;
  alertsCount: number;
  onOpenGeminiSuite?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  roleMode,
  patient,
  currentUser,
  onUpdateLanguage,
  onResetData,
  onLogout,
  alertsCount,
  onOpenGeminiSuite,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-700 to-emerald-600 text-white flex items-center justify-center shadow-md font-black">
            <Heart size={22} className="fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                SevaCare AI
              </h1>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                currentUser?.role === "PATIENT"
                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                  : currentUser?.role === "CAREGIVER"
                  ? "bg-teal-100 text-teal-900 border-teal-300"
                  : "bg-purple-100 text-purple-900 border-purple-300"
              }`}>
                {currentUser?.role === "PATIENT"
                  ? "👵 Senior Voice Portal"
                  : currentUser?.role === "CAREGIVER"
                  ? "👨‍💼 Caretaker Management Portal"
                  : "🛡️ Administrator Portal"}
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium hidden sm:block">
              {currentUser?.role === "PATIENT"
                ? "Loud, clear voice reminders & family connection"
                : currentUser?.role === "CAREGIVER"
                ? "Authorized patient schedules, alerts & messages"
                : "System security, audit logs & authorization"}
            </p>
          </div>
        </div>

        {/* Right Tools: Language Selector, User Profile Pill, Logout */}
        <div className="flex items-center gap-2.5">
          {/* Language Selector */}
          <div className="flex items-center bg-stone-50 border border-stone-300 rounded-xl px-2.5 py-1 text-xs font-bold">
            <Languages size={15} className="text-teal-700 mr-1.5 shrink-0" />
            <select
              id="select-app-language"
              value={patient.preferredLanguage}
              onChange={(e) => {
                const found = SUPPORTED_LANGUAGES.find((l) => l.name === e.target.value);
                if (found) {
                  onUpdateLanguage(found.name, found.speechCode);
                  soundFx.playSuccessChime();
                }
              }}
              className="bg-transparent font-bold text-stone-800 focus:outline-none cursor-pointer text-xs"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.name}>
                  {lang.flag} {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>
          </div>

          {/* User Role Badge */}
          {currentUser && (
            <div className="flex items-center gap-2 bg-stone-100 border border-stone-200 px-3 py-1 rounded-xl text-xs font-extrabold text-stone-800">
              <span className="text-base">{currentUser.avatarUrl || (currentUser.role === "PATIENT" ? "👵" : "👨‍💼")}</span>
              <span className="max-w-[120px] truncate">{currentUser.name}</span>
            </div>
          )}

          {/* Caretaker Alert Bell */}
          {currentUser?.role === "CAREGIVER" && alertsCount > 0 && (
            <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-800 px-2.5 py-1 rounded-xl text-xs font-extrabold animate-pulse">
              <Bell size={14} className="text-rose-600 fill-rose-600" />
              <span>{alertsCount}</span>
            </div>
          )}

          {/* Gemini AI Suite Launch Button */}
          {onOpenGeminiSuite && (
            <button
              id="btn-open-gemini-suite"
              type="button"
              onClick={() => {
                onOpenGeminiSuite();
                soundFx.playTap();
              }}
              className="flex items-center gap-1.5 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white px-3 py-1.5 rounded-xl text-xs font-black shadow-xs cursor-pointer transition transform active:scale-95"
            >
              <Sparkles size={14} className="text-emerald-200 animate-spin" />
              <span>AI Intelligence Suite</span>
            </button>
          )}

          {/* Direct Logout Button */}
          <button
            id="btn-app-logout"
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>

          {/* Reset Demo Data Button */}
          <button
            id="btn-reset-data"
            type="button"
            onClick={onResetData}
            title="Reset to sample demo data"
            className="p-1.5 text-stone-400 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
    </header>
  );
};
