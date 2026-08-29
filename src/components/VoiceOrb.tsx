import React from "react";
import { Mic, Volume2, Sparkles, Pill, MessageCircleHeart, AlertTriangle, ShieldAlert } from "lucide-react";
import { IntentCategory } from "../types";

interface VoiceOrbProps {
  state: "idle" | "speaking" | "listening" | "processing";
  transcript?: string;
  spokenText?: string;
  activeCategory?: IntentCategory | "COMPANION" | "CARE" | null;
  isContinuousConversation?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  state,
  transcript,
  spokenText,
  activeCategory,
  isContinuousConversation = false,
  onClick,
  size = "lg",
}) => {
  const sizeClasses = {
    sm: "w-20 h-20",
    md: "w-32 h-32",
    lg: "w-44 h-44 sm:w-52 sm:h-52",
  };

  const iconSizes = {
    sm: 28,
    md: 40,
    lg: 56,
  };

  const isEmergency = activeCategory === "emergency help";
  const isMedicineUpdate = activeCategory === "medicine status update" || activeCategory === "CARE";
  const isGeneralChat = activeCategory === "general inquiry/chat" || activeCategory === "COMPANION";

  const getStatusText = () => {
    switch (state) {
      case "speaking":
        if (isEmergency) return "🚨 Emergency Protocol Activating...";
        if (isMedicineUpdate) return "💊 Medicine Assistant Responding...";
        return "🌸 Friendly AI Companion Speaking...";
      case "listening":
        return isContinuousConversation
          ? "Listening to you... Speak naturally"
          : "Listening to you... Speak now";
      case "processing":
        return "Understanding & Classifying Intent...";
      default:
        return "Tap to Speak With AI";
    }
  };

  const getStatusSubtext = () => {
    switch (state) {
      case "speaking":
        if (isEmergency) return "Caregiver and emergency response notified immediately";
        if (isMedicineUpdate) return "Updating medication logs and schedule status";
        return "Listening patiently to your response right after";
      case "listening":
        return "Ask a question, update medicine status, or request help";
      case "processing":
        return "Classifying into General Chat, Medicine Status, or Emergency";
      default:
        return "Chat & Stories • Medicine Updates • Emergency SOS";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-2 sm:p-4 w-full">
      {/* 3-Way Intent Category Badges Header */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-3">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all ${
            isGeneralChat
              ? "bg-rose-600 text-white shadow-md ring-2 ring-rose-300 scale-105"
              : "bg-rose-50 text-rose-800 border border-rose-200 opacity-80"
          }`}
        >
          <MessageCircleHeart size={13} className={isGeneralChat ? "text-white" : "text-rose-600"} />
          General Inquiry & Chat
        </span>

        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all ${
            isMedicineUpdate
              ? "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300 scale-105"
              : "bg-emerald-50 text-emerald-800 border border-emerald-200 opacity-80"
          }`}
        >
          <Pill size={13} className={isMedicineUpdate ? "text-white" : "text-emerald-700"} />
          Medicine Status Update
        </span>

        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all ${
            isEmergency
              ? "bg-red-600 text-white shadow-md ring-2 ring-red-300 animate-pulse scale-105"
              : "bg-red-50 text-red-800 border border-red-200 opacity-80"
          }`}
        >
          <ShieldAlert size={13} className={isEmergency ? "text-white" : "text-red-600"} />
          Emergency Help
        </span>

        {isContinuousConversation && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300 animate-pulse">
            🔄 Live Dialogue
          </span>
        )}
      </div>

      {/* Orb container */}
      <div className="relative flex items-center justify-center">
        {/* Animated outer glow rings */}
        {state === "listening" && (
          <>
            <div className="absolute -inset-4 rounded-full bg-emerald-400/30 animate-ping duration-1000" />
            <div className="absolute -inset-8 rounded-full bg-emerald-500/20 animate-pulse duration-700" />
          </>
        )}

        {state === "speaking" && (
          <>
            <div className={`absolute -inset-3 rounded-full animate-pulse duration-500 ${isEmergency ? "bg-red-500/40" : isMedicineUpdate ? "bg-emerald-400/30" : "bg-amber-400/30"}`} />
            <div className={`absolute -inset-6 rounded-full animate-ping duration-1000 ${isEmergency ? "bg-red-600/30" : isMedicineUpdate ? "bg-teal-400/20" : "bg-rose-400/20"}`} />
          </>
        )}

        {state === "processing" && (
          <div className="absolute -inset-4 rounded-full bg-indigo-500/30 animate-spin duration-1000" />
        )}

        {/* Central interactive button */}
        <button
          id="btn-voice-orb-interactive"
          onClick={onClick}
          type="button"
          aria-label={getStatusText()}
          className={`${sizeClasses[size]} rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 transform active:scale-95 shadow-xl border-4 ${
            state === "listening"
              ? "bg-gradient-to-tr from-emerald-600 to-teal-500 border-emerald-300 text-white ring-8 ring-emerald-200"
              : state === "speaking"
              ? isEmergency
                ? "bg-gradient-to-tr from-red-600 via-rose-700 to-red-800 border-red-300 text-white ring-8 ring-red-200 animate-pulse"
                : isMedicineUpdate
                ? "bg-gradient-to-tr from-teal-600 via-emerald-600 to-emerald-700 border-emerald-200 text-white ring-8 ring-emerald-200"
                : "bg-gradient-to-tr from-amber-500 via-rose-500 to-orange-500 border-amber-200 text-white ring-8 ring-amber-200"
              : state === "processing"
              ? "bg-gradient-to-tr from-indigo-600 to-purple-600 border-indigo-200 text-white ring-8 ring-indigo-200"
              : "bg-gradient-to-tr from-teal-700 via-emerald-800 to-teal-900 border-teal-200 text-white hover:from-teal-600 hover:to-emerald-700 ring-4 ring-teal-100 hover:ring-8"
          }`}
        >
          {state === "listening" ? (
            <Mic className="animate-bounce" size={iconSizes[size]} />
          ) : state === "speaking" ? (
            isEmergency ? <AlertTriangle className="animate-bounce" size={iconSizes[size]} /> : <Volume2 className="animate-pulse" size={iconSizes[size]} />
          ) : state === "processing" ? (
            <Sparkles className="animate-spin" size={iconSizes[size]} />
          ) : (
            <Mic size={iconSizes[size]} />
          )}

          <span className="text-xs sm:text-sm font-bold tracking-wide mt-1 uppercase">
            {state === "listening" ? "Listening" : state === "speaking" ? "Speaking" : state === "processing" ? "AI Thinking" : "Tap to Talk"}
          </span>
        </button>
      </div>

      {/* Visual Audio Waveform bars when listening or speaking */}
      {(state === "listening" || state === "speaking") && (
        <div className="flex items-center gap-1.5 mt-4 h-6">
          {[40, 75, 100, 60, 90, 45, 80, 55, 95, 70].map((h, i) => (
            <div
              key={i}
              className={`w-1.5 rounded-full transition-all duration-150 ${
                state === "listening"
                  ? "bg-emerald-500"
                  : isEmergency
                  ? "bg-red-500"
                  : isMedicineUpdate
                  ? "bg-teal-500"
                  : "bg-rose-500"
              }`}
              style={{
                height: `${Math.max(8, (h * Math.sin(Date.now() / 200 + i)) % 24 + 10)}px`,
              }}
            />
          ))}
        </div>
      )}

      {/* Status Badges & Text */}
      <div className="text-center mt-3 max-w-md">
        <div className={`text-lg sm:text-xl font-extrabold ${isEmergency ? "text-red-700" : "text-stone-900"}`}>
          {getStatusText()}
        </div>
        <div className="text-xs sm:text-sm font-medium text-stone-600 mt-0.5">
          {getStatusSubtext()}
        </div>
      </div>

      {/* Live speech transcription */}
      {transcript && (
        <div className="mt-3 bg-emerald-50 border-2 border-emerald-300 rounded-2xl px-5 py-3 text-stone-900 max-w-lg text-center shadow-sm w-full">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block mb-1">
            🗣️ Heard from you:
          </span>
          <p className="text-base sm:text-lg font-bold text-emerald-950 italic">
            "{transcript}"
          </p>
        </div>
      )}

      {/* Live speech response with Category Header */}
      {state === "speaking" && spokenText && (
        <div
          className={`mt-3 border-2 rounded-2xl px-5 py-3 text-stone-900 max-w-lg text-center shadow-sm w-full ${
            isEmergency
              ? "bg-red-50 border-red-400 text-red-950"
              : isMedicineUpdate
              ? "bg-emerald-50 border-emerald-300 text-emerald-950"
              : "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 text-amber-950"
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="text-xs font-black uppercase tracking-wider">
              {isEmergency
                ? "🚨 AI Emergency Response:"
                : isMedicineUpdate
                ? "💊 AI Medicine Status Response:"
                : "🌸 AI Companion Voice Response:"}
            </span>
          </div>
          <p className="text-base sm:text-lg font-bold leading-relaxed">
            "{spokenText}"
          </p>
        </div>
      )}
    </div>
  );
};
