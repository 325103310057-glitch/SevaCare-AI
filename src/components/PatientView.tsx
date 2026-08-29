import React, { useState, useEffect, useRef } from "react";
import {
  ScheduledDose,
  PatientProfile,
  SUPPORTED_LANGUAGES,
  LanguageOption,
  ConversationTurn,
  IntentCategory,
} from "../types";
import { VoiceOrb } from "./VoiceOrb";
import { VoiceHelpModal } from "./VoiceHelpModal";
import { CompanionCards } from "./CompanionCards";
import { soundFx, speakText, stopSpeaking, createSpeechRecognizer } from "../utils/audio";
import { storage } from "../utils/storage";
import {
  CheckCircle2,
  Clock,
  Volume2,
  PhoneCall,
  AlertTriangle,
  HeartHandshake,
  Pill,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  RotateCcw,
  Languages,
  Utensils,
  Sun,
  Moon,
  Coffee,
  Mic,
  HelpCircle,
  MessageCircle,
  BookOpen,
  Heart,
  Smile,
  Send,
} from "lucide-react";

interface PatientViewProps {
  patient: PatientProfile;
  doses: ScheduledDose[];
  onUpdateDose: (updatedDose: ScheduledDose) => void;
  onPatientAlert: (alertData: any) => void;
  activeDoseId?: string | null;
  onTriggerReminder?: (doseId: string) => void;
  isCompactDualMode?: boolean;
}

export const PatientView: React.FC<PatientViewProps> = ({
  patient,
  doses,
  onUpdateDose,
  onPatientAlert,
  activeDoseId,
  onTriggerReminder,
  isCompactDualMode = false,
}) => {
  // Voice state
  const [voiceState, setVoiceState] = useState<"idle" | "speaking" | "listening" | "processing">("idle");
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [spokenText, setSpokenText] = useState<string>("");
  const [lastAIResponse, setLastAIResponse] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<IntentCategory | null>(null);
  const [currentFollowUpPrompt, setCurrentFollowUpPrompt] = useState<string | null>(null);
  const [selectedExampleCategory, setSelectedExampleCategory] = useState<IntentCategory | "ALL">("ALL");
  const [isEmergencyActive, setIsEmergencyActive] = useState<boolean>(false);

  // Live dialogue conversation history
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([
    {
      id: "initial-1",
      role: "assistant",
      text: `Hello ${patient.name.split(" ")[0]}! I am your AI companion and medicine care assistant. I am here to help with your medicines, answer questions, or chat anytime.`,
      category: "general inquiry/chat",
      timestamp: "Today",
    },
  ]);

  // Time & date display
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  // 10-Minute Reminder Timer state
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [countdownDuration, setCountdownDuration] = useState<number>(600); // 10 minutes (600s)

  // Voice message modal for talking to family
  const [isFamilyMsgOpen, setIsFamilyMsgOpen] = useState<boolean>(false);
  const [familyMsgText, setFamilyMsgText] = useState<string>("");

  // Voice help modal for commands guide
  const [isVoiceHelpOpen, setIsVoiceHelpOpen] = useState<boolean>(false);

  // Active reminder dose
  const activeDose = doses.find((d) => d.id === activeDoseId) || doses.find(
    (d) => d.status === "REMINDING_STAGE_1" || d.status === "WAITING_10_MIN" || d.status === "REMINDING_STAGE_2"
  ) || null;

  // Selected language
  const currentLang = SUPPORTED_LANGUAGES.find(
    (l) => l.name.toLowerCase() === patient.preferredLanguage.toLowerCase() || l.speechCode === patient.languageCode
  ) || SUPPORTED_LANGUAGES[0];

  // Speech recognizer ref
  const recognizerRef = useRef<any>(null);

  // Connection Requests state
  const [connectionRequests, setConnectionRequests] = useState(storage.getConnectionRequests());

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setConnectionRequests(storage.getConnectionRequests());
    });
    return () => unsub();
  }, []);

  const pendingRequests = connectionRequests.filter(
    (r) => r.status === "PENDING" && (r.patientPhone === patient.phone || r.patientName.toLowerCase().includes(patient.name.toLowerCase().split(" ")[0]))
  );

  const handleAcceptConnection = (requestId: string) => {
    soundFx.playSuccessChime();
    storage.respondConnectionRequest(requestId, "APPROVED", patient.name);
    setConnectionRequests(storage.getConnectionRequests());
    speakText(`Connection approved. Your caretaker is now authorized.`, patient.languageCode, patient.voiceVolume);
  };

  const handleDeclineConnection = (requestId: string) => {
    soundFx.playTap();
    storage.respondConnectionRequest(requestId, "REJECTED", patient.name);
    setConnectionRequests(storage.getConnectionRequests());
  };

  // Update clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle 10-minute timer countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timerActive && timerSecondsLeft !== null && timerSecondsLeft > 0) {
      timer = setInterval(() => {
        setTimerSecondsLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (timerActive && timerSecondsLeft === 0 && activeDose) {
      // 10 minutes elapsed with no confirmation!
      handleTenMinuteTimeout();
    }
    return () => clearInterval(timer);
  }, [timerActive, timerSecondsLeft, activeDose]);

  // When active dose status changes, trigger voice speech automatically
  useEffect(() => {
    if (!activeDose) return;

    if (activeDose.status === "REMINDING_STAGE_1") {
      triggerStage1Reminder(activeDose);
    } else if (activeDose.status === "REMINDING_STAGE_2") {
      triggerStage2Reminder(activeDose);
    }
  }, [activeDose?.status, activeDose?.id]);

  // Trigger Stage 1 Voice Reminder
  const triggerStage1Reminder = async (dose: ScheduledDose) => {
    soundFx.playReminderChime();
    setVoiceState("speaking");

    try {
      const res = await fetch("/api/generate-reminder-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicineName: dose.medicineName,
          dosage: dose.dosage,
          scheduledTime: dose.scheduledTime,
          instructions: dose.instructions,
          language: patient.preferredLanguage,
          patientName: patient.name.split(" ")[0],
          isSecondReminder: false,
        }),
      });
      const data = await res.json();
      const speech = data.reminderScript || `Good morning ${patient.name}. It is now ${dose.scheduledTime}. This is your medicine time. Please take your ${dose.medicineName}, ${dose.dosage}. After taking it, please tell me that you have taken your medicine.`;
      
      setSpokenText(speech);

      await speakText(
        speech,
        patient.languageCode,
        patient.voiceVolume,
        patient.voiceSpeed,
        () => setVoiceState("speaking"),
        () => {
          setVoiceState("listening");
          // Start 10-minute waiting timer
          setTimerSecondsLeft(600); // 10 minutes
          setTimerActive(true);
          startListening();
        }
      );
    } catch (e) {
      console.error("Error speaking Stage 1 reminder:", e);
      setVoiceState("idle");
    }
  };

  // Trigger Stage 2 Follow-up Voice Reminder (After 10 mins)
  const triggerStage2Reminder = async (dose: ScheduledDose) => {
    soundFx.playAttentionChime();
    setVoiceState("speaking");

    try {
      const res = await fetch("/api/generate-reminder-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicineName: dose.medicineName,
          dosage: dose.dosage,
          scheduledTime: dose.scheduledTime,
          instructions: dose.instructions,
          language: patient.preferredLanguage,
          patientName: patient.name.split(" ")[0],
          isSecondReminder: true,
        }),
      });
      const data = await res.json();
      const speech = data.reminderScript || `Hello ${patient.name}. This is a reminder. It is time to take your ${dose.medicineName}. Please tell me after you have taken it.`;
      
      setSpokenText(speech);

      await speakText(
        speech,
        patient.languageCode,
        patient.voiceVolume,
        patient.voiceSpeed,
        () => setVoiceState("speaking"),
        () => {
          setVoiceState("listening");
          // Stage 2 countdown: 120s final window before dispatching alert to caregiver
          setTimerSecondsLeft(120);
          setTimerActive(true);
          startListening();
        }
      );
    } catch (e) {
      console.error("Error speaking Stage 2 reminder:", e);
      setVoiceState("idle");
    }
  };

  // Handle what happens when the 10-minute timer expires
  const handleTenMinuteTimeout = () => {
    if (!activeDose) return;

    if (activeDose.status === "REMINDING_STAGE_1" || activeDose.status === "WAITING_10_MIN") {
      // Transition to Stage 2 Reminder!
      const updated: ScheduledDose = {
        ...activeDose,
        status: "REMINDING_STAGE_2",
        stage: 2,
        secondRemindedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      onUpdateDose(updated);
    } else if (activeDose.status === "REMINDING_STAGE_2") {
      // No response after 2nd reminder -> Send Urgent Alert to Caregiver!
      const updated: ScheduledDose = {
        ...activeDose,
        status: "CARE_ALERTED",
      };
      onUpdateDose(updated);
      setTimerActive(false);
      setTimerSecondsLeft(null);

      // Create caregiver alert
      storage.addAlert({
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "MISSED_MEDICINE",
        priority: "URGENT",
        title: "Medicine Reminder Alert: Missed Dose",
        message: `The patient (${patient.name}) has not confirmed taking their ${activeDose.medicineName} scheduled for ${activeDose.scheduledTime} after 2 voice reminders.`,
        patientName: patient.name,
        medicineName: activeDose.medicineName,
        transcript: "No voice or manual response received after 2 attempts.",
        acknowledged: false,
      });

      soundFx.playEmergencyAlarm();
      speakText(
        `I have notified your caregiver ${patient.emergencyContact.name} so they can check on you.`,
        patient.languageCode,
        patient.voiceVolume
      );
    }
  };

  // Start Speech Recognition
  const startListening = () => {
    soundFx.playMicClick();
    stopSpeaking();
    setVoiceState("listening");

    try {
      const recognizer = createSpeechRecognizer({
        languageCode: patient.languageCode,
        onResult: (transcript) => {
          setCurrentTranscript(transcript);
        },
        onError: (err) => {
          console.warn("Recognition error:", err);
          setVoiceState("idle");
        },
        onStateChange: (listening) => {
          if (!listening && voiceState === "listening") {
            // Process whatever transcript was collected
          }
        },
      });

      if (recognizer) {
        recognizerRef.current = recognizer;
        recognizer.start();
      }
    } catch (e) {
      console.warn("Speech recognition initialization failed:", e);
    }
  };

  const stopListeningAndProcess = () => {
    if (recognizerRef.current) {
      try {
        recognizerRef.current.stop();
      } catch (e) {}
    }
    if (currentTranscript.trim()) {
      processPatientVoiceInput(currentTranscript);
    } else {
      setVoiceState("idle");
    }
  };

  // Process voice input through backend Gemini AI
  const processPatientVoiceInput = async (transcript: string) => {
    setVoiceState("processing");
    const currentTimeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Append user's turn to conversation history
    const userTurn: ConversationTurn = {
      id: `turn-${Date.now()}-u`,
      role: "user",
      text: transcript,
      timestamp: currentTimeStr,
    };
    setConversationHistory((prev) => [...prev, userTurn]);

    try {
      const res = await fetch("/api/voice-process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          activeReminder: activeDose
            ? {
                medicineName: activeDose.medicineName,
                dosage: activeDose.dosage,
                scheduledTime: activeDose.scheduledTime,
                instructions: activeDose.instructions,
              }
            : null,
          upcomingDoses: doses
            .filter((d) => d.status === "PENDING" || d.status === "WAITING_10_MIN")
            .map((d) => ({
              medicineName: d.medicineName,
              dosage: d.dosage,
              scheduledTime: d.scheduledTime,
            })),
          patientLanguage: patient.preferredLanguage,
          patientName: patient.name.split(" ")[0],
          conversationHistory: conversationHistory.slice(-6).map((c) => ({
            role: c.role,
            text: c.text,
          })),
        }),
      });

      const result = await res.json();
      setLastAIResponse(result.spokenResponse || "");
      const finalCategory: IntentCategory = result.category || "general inquiry/chat";
      setActiveCategory(finalCategory);
      setCurrentFollowUpPrompt(result.followUpPrompt || null);

      // Append assistant's turn to conversation history
      const assistantTurn: ConversationTurn = {
        id: `turn-${Date.now()}-a`,
        role: "assistant",
        text: result.spokenResponse,
        category: finalCategory,
        intent: result.intent,
        timestamp: currentTimeStr,
      };
      setConversationHistory((prev) => [...prev, assistantTurn]);

      // Category 1: EMERGENCY HELP
      if (finalCategory === "emergency help" || result.intent === "NEED_HELP" || result.intent === "UNWELL_SYMPTOM") {
        setIsEmergencyActive(true);
        soundFx.playEmergencyAlarm();

        // Trigger priority alert to caregiver
        storage.addAlert({
          timestamp: currentTimeStr,
          type: result.intent === "NEED_HELP" ? "EMERGENCY_SOS" : "PATIENT_UNWELL",
          priority: "EMERGENCY",
          category: "emergency help",
          title: result.intent === "NEED_HELP" ? "🚨 EMERGENCY HELP REQUESTED" : "⚠️ Urgent Health Symptom / Unwell",
          message: result.symptomSummary || `Patient said: "${transcript}"`,
          patientName: patient.name,
          transcript,
          englishTranslation: result.englishTranslation,
          symptomSummary: result.symptomSummary,
          acknowledged: false,
        });

        // Also add to urgent message feed
        storage.addMessage({
          timestamp: currentTimeStr,
          sender: "PATIENT",
          text: transcript,
          translation: result.englishTranslation,
          language: patient.preferredLanguage,
          urgency: "EMERGENCY",
        });

        if (onPatientAlert) {
          onPatientAlert({
            id: `sos-${Date.now()}`,
            timestamp: currentTimeStr,
            type: "EMERGENCY_SOS",
            priority: "EMERGENCY",
            category: "emergency help",
            title: "🚨 EMERGENCY HELP REQUESTED",
            message: result.symptomSummary || transcript,
            patientName: patient.name,
            transcript,
            englishTranslation: result.englishTranslation,
            acknowledged: false,
          });
        }
      }
      // Category 2: MEDICINE STATUS UPDATE
      else if (finalCategory === "medicine status update") {
        setIsEmergencyActive(false);

        if (result.intent === "MEDICINE_TAKEN") {
          soundFx.playSuccessChime();
          if (activeDose) {
            const updated: ScheduledDose = {
              ...activeDose,
              status: "CONFIRMED_TAKEN",
              confirmedAt: currentTimeStr,
              patientResponse: transcript,
            };
            onUpdateDose(updated);
            setTimerActive(false);
            setTimerSecondsLeft(null);
          }

          // Notify caregiver of confirmation
          storage.addAlert({
            timestamp: currentTimeStr,
            type: "CONFIRMED",
            priority: "INFO",
            category: "medicine status update",
            title: "Medicine Taken Confirmed",
            message: `${patient.name} confirmed taking ${activeDose?.medicineName || "medicine"}.`,
            patientName: patient.name,
            medicineName: activeDose?.medicineName,
            transcript,
            acknowledged: true,
          });
        } else if (result.intent === "WILL_TAKE_NOW" || result.intent === "MEDICINE_NOT_TAKEN") {
          soundFx.playSuccessChime();
          if (activeDose) {
            const updated: ScheduledDose = {
              ...activeDose,
              status: "WAITING_10_MIN",
              patientResponse: transcript,
            };
            onUpdateDose(updated);
            setTimerSecondsLeft(600); // 10 minutes snooze
            setTimerActive(true);
          }
        } else if (result.intent === "MEDICINE_UNAVAILABLE") {
          storage.addAlert({
            timestamp: currentTimeStr,
            type: "MEDICINE_OUT",
            priority: "WARNING",
            category: "medicine status update",
            title: "Medicine Out of Stock / Refill Needed",
            message: `${patient.name} stated medicine is finished or unavailable.`,
            patientName: patient.name,
            medicineName: activeDose?.medicineName,
            transcript,
            acknowledged: false,
          });
        } else if (result.caregiverNote || result.intent === "CAREGIVER_MESSAGE") {
          storage.addMessage({
            timestamp: currentTimeStr,
            sender: "PATIENT",
            text: result.caregiverNote || transcript,
            translation: result.englishTranslation || transcript,
            language: patient.preferredLanguage,
            urgency: "NORMAL",
          });
        }
      }
      // Category 3: GENERAL INQUIRY / CHAT
      else {
        setIsEmergencyActive(false);
        if (result.caregiverNote || result.intent === "CAREGIVER_MESSAGE" || result.intent === "GENERAL_MESSAGE") {
          storage.addMessage({
            timestamp: currentTimeStr,
            sender: "PATIENT",
            text: result.caregiverNote || transcript,
            translation: result.englishTranslation || transcript,
            language: patient.preferredLanguage,
            urgency: "NORMAL",
          });
        }
      }

      // Speak back the comforting AI response
      setVoiceState("speaking");
      setSpokenText(result.spokenResponse);
      await speakText(
        result.spokenResponse,
        patient.languageCode,
        patient.voiceVolume,
        patient.voiceSpeed,
        () => setVoiceState("speaking"),
        () => {
          setVoiceState("idle");
          setCurrentTranscript("");
        }
      );
    } catch (e) {
      console.error("Error processing voice input:", e);
      setVoiceState("idle");
    }
  };

  // Manual button: "I Have Taken My Medicine"
  const handleManualConfirmTaken = () => {
    if (!activeDose) return;
    soundFx.playSuccessChime();
    const updated: ScheduledDose = {
      ...activeDose,
      status: "CONFIRMED_TAKEN",
      confirmedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      patientResponse: "Confirmed via button press",
    };
    onUpdateDose(updated);
    setTimerActive(false);
    setTimerSecondsLeft(null);

    storage.addAlert({
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "CONFIRMED",
      priority: "INFO",
      title: "Medicine Confirmed Taken",
      message: `${patient.name} took ${activeDose.medicineName} (${activeDose.dosage}).`,
      patientName: patient.name,
      medicineName: activeDose.medicineName,
      transcript: "I have taken my medicine.",
      acknowledged: true,
    });

    const confirmSpeech = `Wonderful! I have marked your ${activeDose.medicineName} as taken. Stay healthy!`;
    setSpokenText(confirmSpeech);
    speakText(confirmSpeech, patient.languageCode, patient.voiceVolume);
  };

  // Manual button: "I Will Take In 10 Min"
  const handleManualSnooze = () => {
    if (!activeDose) return;
    soundFx.playMicClick();
    const updated: ScheduledDose = {
      ...activeDose,
      status: "WAITING_10_MIN",
      patientResponse: "Snoozed for 10 minutes",
    };
    onUpdateDose(updated);
    setTimerSecondsLeft(600); // 10 minutes
    setTimerActive(true);

    const snoozeSpeech = `Understood. Please take your ${activeDose.medicineName} soon. I will remind you again in 10 minutes.`;
    setSpokenText(snoozeSpeech);
    speakText(snoozeSpeech, patient.languageCode, patient.voiceVolume);
  };

  // Emergency SOS Trigger
  const handleEmergencySOS = () => {
    soundFx.playEmergencyAlarm();
    storage.addAlert({
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "EMERGENCY_SOS",
      priority: "EMERGENCY",
      title: "🚨 EMERGENCY SOS ACTIVATED BY PATIENT",
      message: `${patient.name} pressed the Emergency SOS button. Immediate caregiver attention required!`,
      patientName: patient.name,
      transcript: "EMERGENCY SOS BUTTON ACTIVATED",
      acknowledged: false,
    });

    storage.addMessage({
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sender: "PATIENT",
      text: "🚨 EMERGENCY HELP! Please contact me immediately.",
      language: patient.preferredLanguage,
      urgency: "EMERGENCY",
    });

    const sosSpeech = `Emergency alert triggered! I have contacted your family ${patient.emergencyContact.name} at ${patient.emergencyContact.phone}. Help is on the way.`;
    setSpokenText(sosSpeech);
    speakText(sosSpeech, patient.languageCode, patient.voiceVolume);
  };

  // Replay reminder voice
  const handleReplayReminder = () => {
    if (activeDose) {
      if (activeDose.status === "REMINDING_STAGE_2") {
        triggerStage2Reminder(activeDose);
      } else {
        triggerStage1Reminder(activeDose);
      }
    } else {
      const greeting = `Hello ${patient.name}! All your medicines for this hour are up to date. Press the microphone anytime you want to speak with me.`;
      setSpokenText(greeting);
      speakText(greeting, patient.languageCode, patient.voiceVolume);
    }
  };

  // Fast-forward 10m timer (for easy review/testing)
  const handleFastForwardTimer = () => {
    setTimerSecondsLeft(3);
  };

  return (
    <div className={`w-full max-w-2xl mx-auto flex flex-col gap-6 ${isCompactDualMode ? "p-3" : "p-4 sm:p-6"}`}>
      {/* Top Header Card with Large Clock & Patient Avatar */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-3xl p-5 sm:p-7 shadow-lg border-2 border-emerald-600/30 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-100 border-4 border-emerald-300 text-emerald-900 font-black text-2xl sm:text-3xl flex items-center justify-center shadow-inner">
            👵
          </div>
          <div>
            <div className="text-xs sm:text-sm font-semibold tracking-wider text-emerald-200 uppercase">
              Elderly Care Voice Assistant
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {patient.name}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-emerald-100 text-xs sm:text-sm font-medium">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Voice Active • {currentLang.nativeName} ({currentLang.flag})</span>
            </div>
          </div>
        </div>

        {/* Big Clock Display & Voice Help Button */}
        <div className="flex flex-col items-end gap-2 text-right">
          <button
            id="btn-open-voice-help"
            type="button"
            onClick={() => {
              setIsVoiceHelpOpen(true);
              soundFx.playMicClick();
            }}
            className="bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-500 text-white border border-emerald-400/50 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
            title="Open Voice Help & List of Available Commands"
          >
            <HelpCircle size={16} className="text-emerald-200" />
            <span>Voice Help</span>
          </button>
          <div>
            <div className="text-2xl sm:text-4xl font-black tracking-tight text-emerald-300 font-mono">
              {currentTime || "08:00 AM"}
            </div>
            <div className="text-[11px] sm:text-sm font-medium text-emerald-200">
              {currentDate || "Today"}
            </div>
          </div>
        </div>
      </div>

      {/* Pending Connection Requests Banner */}
      {pendingRequests.length > 0 && (
        <div className="flex flex-col gap-3">
          {pendingRequests.map((req) => (
            <div
              key={req.id}
              className="bg-amber-50 border-3 border-amber-400 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-2"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-200 border border-amber-400 text-2xl flex items-center justify-center shrink-0">
                  👨‍💼
                </div>
                <div>
                  <span className="text-[11px] font-black text-amber-900 bg-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Caretaker Authorization Request
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-stone-900 mt-0.5">
                    {req.caretakerName} ({req.relation})
                  </h3>
                  <p className="text-xs text-stone-600 font-medium">
                    Phone: {req.caretakerPhone} • Wants to link as your Caretaker
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  id={`btn-approve-conn-${req.id}`}
                  type="button"
                  onClick={() => handleAcceptConnection(req.id)}
                  className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-black px-4 py-2.5 rounded-xl cursor-pointer transition-all shadow-md"
                >
                  ✓ Approve & Link
                </button>
                <button
                  id={`btn-decline-conn-${req.id}`}
                  type="button"
                  onClick={() => handleDeclineConnection(req.id)}
                  className="flex-1 sm:flex-none bg-stone-200 hover:bg-rose-100 hover:text-rose-700 text-stone-700 text-xs sm:text-sm font-bold px-3.5 py-2.5 rounded-xl cursor-pointer transition-all"
                >
                  ✕ Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Central Voice Assistant Interactive Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-md border-2 border-stone-200 flex flex-col items-center text-center relative overflow-hidden">
        {/* Stage 1 / Stage 2 Banner if reminder is active */}
        {activeDose && (
          <div className={`w-full py-2.5 px-4 rounded-2xl mb-4 text-sm sm:text-base font-extrabold flex items-center justify-between ${
            activeDose.status === "REMINDING_STAGE_2"
              ? "bg-amber-100 text-amber-900 border-2 border-amber-300 animate-pulse"
              : activeDose.status === "CARE_ALERTED"
              ? "bg-rose-100 text-rose-900 border-2 border-rose-300"
              : "bg-emerald-100 text-emerald-900 border-2 border-emerald-300"
          }`}>
            <span className="flex items-center gap-2">
              <Pill size={20} className={activeDose.status === "REMINDING_STAGE_2" ? "text-amber-700" : "text-emerald-700"} />
              {activeDose.status === "REMINDING_STAGE_2"
                ? "⚠️ 2nd Follow-up Reminder (10 mins elapsed)"
                : activeDose.status === "CARE_ALERTED"
                ? "🚨 Caregiver Alerted: Missed Dose"
                : "⏰ Medicine Time Reminder Active"}
            </span>

            {/* 10-Min Timer Countdown */}
            {timerActive && timerSecondsLeft !== null && (
              <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-xl text-xs sm:text-sm font-mono font-bold shadow-sm">
                <Clock size={16} className="text-amber-600 animate-spin" />
                <span>
                  {Math.floor(timerSecondsLeft / 60)}:
                  {(timerSecondsLeft % 60).toString().padStart(2, "0")}
                </span>
                <button
                  id="btn-fast-forward-timer"
                  onClick={handleFastForwardTimer}
                  title="Simulate timer timeout"
                  className="ml-1 text-[10px] bg-stone-100 hover:bg-stone-200 px-1.5 py-0.5 rounded text-stone-600 font-sans cursor-pointer"
                >
                  Skip ⏭️
                </button>
              </div>
            )}
          </div>
        )}

        {/* Glowing Interactive Voice Orb */}
        <VoiceOrb
          state={voiceState}
          transcript={currentTranscript}
          spokenText={spokenText}
          activeCategory={activeCategory}
          isContinuousConversation={voiceState === "listening" && conversationHistory.length > 1}
          onClick={() => {
            if (voiceState === "listening") {
              stopListeningAndProcess();
            } else if (voiceState === "speaking") {
              stopSpeaking();
              setVoiceState("idle");
            } else {
              startListening();
            }
          }}
          size={isCompactDualMode ? "md" : "lg"}
        />

        {/* Active Emergency Alert Banner if Triggered */}
        {isEmergencyActive && (
          <div className="w-full mt-4 bg-red-100 border-3 border-red-500 rounded-2xl p-4 text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-pulse">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🚨</span>
              <div>
                <h4 className="text-sm sm:text-base font-black text-red-900">
                  EMERGENCY SOS DISPATCHED
                </h4>
                <p className="text-xs font-semibold text-red-800">
                  Your authorized caregiver ({patient.emergencyContactName} - {patient.emergencyContactPhone}) has received an urgent notification.
                </p>
              </div>
            </div>
            <button
              id="btn-resolve-emergency"
              type="button"
              onClick={() => setIsEmergencyActive(false)}
              className="bg-red-700 hover:bg-red-800 active:bg-red-900 text-white text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer self-end sm:self-auto"
            >
              Clear Alarm
            </button>
          </div>
        )}

        {/* AI Follow-Up Prompt Quick Action */}
        {currentFollowUpPrompt && voiceState === "idle" && (
          <div className="w-full mt-3 bg-gradient-to-r from-rose-50 to-amber-50 border-2 border-rose-200 rounded-2xl p-3.5 text-left flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">💭</span>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 block">
                  AI Follow-Up Question:
                </span>
                <p className="text-xs sm:text-sm font-bold text-stone-800">
                  {currentFollowUpPrompt}
                </p>
              </div>
            </div>
            <button
              id="btn-reply-follow-up"
              type="button"
              onClick={() => startListening()}
              className="shrink-0 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-black px-3 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
            >
              <Mic size={14} />
              <span>Answer</span>
            </button>
          </div>
        )}

        {/* Categorized Test Prompts for the 3 Intent Categories */}
        <div className="w-full mt-4 pt-4 border-t border-stone-200">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500" />
              <span>Classified Voice Inputs (Tap to Test Intent Classification):</span>
            </div>

            <button
              id="btn-open-voice-help-guide"
              type="button"
              onClick={() => {
                setIsVoiceHelpOpen(true);
                soundFx.playMicClick();
              }}
              className="text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
            >
              <HelpCircle size={14} className="text-teal-700" />
              <span>Voice Guide</span>
            </button>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {[
              { id: "ALL", label: "All Examples" },
              { id: "general inquiry/chat", label: "🌸 General Inquiry & Chat" },
              { id: "medicine status update", label: "💊 Medicine Status" },
              { id: "emergency help", label: "🚨 Emergency Help" },
            ].map((tab) => (
              <button
                key={tab.id}
                id={`tab-intent-filter-${tab.id.replace(/\s+/g, "-")}`}
                type="button"
                onClick={() => setSelectedExampleCategory(tab.id as IntentCategory | "ALL")}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
                  selectedExampleCategory === tab.id
                    ? "bg-teal-800 text-white shadow-2xs"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
            {[
              { text: "I have taken my medicine.", label: "✅ 'I have taken my medicine'", cat: "medicine status update" as IntentCategory, badge: "Medicine" },
              { text: "Tell me a short pleasant story.", label: "📖 'Tell me a short story'", cat: "general inquiry/chat" as IntentCategory, badge: "Chat" },
              { text: "I will take it in 10 minutes.", label: "⏳ 'I will take it in 10 mins'", cat: "medicine status update" as IntentCategory, badge: "Medicine" },
              { text: "I am feeling lonely today, talk with me.", label: "🌸 'I feel lonely, talk to me'", cat: "general inquiry/chat" as IntentCategory, badge: "Chat" },
              { text: "When is my next medicine scheduled?", label: "⏰ 'When is next medicine?'", cat: "medicine status update" as IntentCategory, badge: "Medicine" },
              { text: "Help me, I fell down and feel dizzy!", label: "🚨 'Help me, I fell down!'", cat: "emergency help" as IntentCategory, badge: "Emergency" },
              { text: "What is today's positive thought?", label: "✨ 'Today's positive thought'", cat: "general inquiry/chat" as IntentCategory, badge: "Chat" },
              { text: "My morning pills are finished, need refill.", label: "📦 'Pills finished, need refill'", cat: "medicine status update" as IntentCategory, badge: "Medicine" },
            ]
              .filter((e) => selectedExampleCategory === "ALL" || e.cat === selectedExampleCategory)
              .map((example, i) => (
                <button
                  key={i}
                  id={`btn-sample-voice-${i}`}
                  type="button"
                  onClick={() => {
                    setCurrentTranscript(example.text);
                    processPatientVoiceInput(example.text);
                  }}
                  className={`border rounded-xl p-2.5 text-xs sm:text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${
                    example.cat === "emergency help"
                      ? "bg-red-50/70 hover:bg-red-100/90 border-red-200 text-red-950 hover:border-red-400"
                      : example.cat === "medicine status update"
                      ? "bg-emerald-50/70 hover:bg-emerald-100/90 border-emerald-200 text-emerald-950 hover:border-emerald-400"
                      : "bg-rose-50/60 hover:bg-rose-100/90 border-rose-200 text-rose-950 hover:border-rose-400"
                  }`}
                >
                  <span>{example.label}</span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      example.cat === "emergency help"
                        ? "bg-red-600 text-white"
                        : example.cat === "medicine status update"
                        ? "bg-emerald-600 text-white"
                        : "bg-rose-600 text-white"
                    }`}
                  >
                    {example.badge}
                  </span>
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* FRIENDLY AI COMPANION SECTION (Stories, Wisdom, Daily Check-In, Mindfulness) */}
      <CompanionCards
        patientName={patient.name}
        patientLanguage={patient.preferredLanguage}
        onSelectPrompt={(promptText) => {
          setCurrentTranscript(promptText);
          processPatientVoiceInput(promptText);
        }}
      />

      {/* RECENT DIALOGUE & CONVERSATION HISTORY TRAY */}
      {conversationHistory.length > 1 && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-stone-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle size={20} className="text-teal-700" />
              <h3 className="text-base sm:text-lg font-black text-stone-900">
                Recent Voice Conversation & Classified Intents
              </h3>
            </div>
            <button
              id="btn-clear-conversation"
              type="button"
              onClick={() => setConversationHistory(conversationHistory.slice(-1))}
              className="text-xs font-semibold text-stone-500 hover:text-stone-800 cursor-pointer"
            >
              Clear Log
            </button>
          </div>

          <div className="flex flex-col gap-2.5 max-h-64 overflow-y-auto pr-1">
            {conversationHistory.slice(-6).map((turn) => {
              const isUser = turn.role === "user";
              const isEmerg = turn.category === "emergency help";
              const isMed = turn.category === "medicine status update" || turn.category === "CARE";
              const isChat = turn.category === "general inquiry/chat" || turn.category === "COMPANION";

              return (
                <div
                  key={turn.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-medium shadow-2xs ${
                      isUser
                        ? "bg-teal-700 text-white rounded-br-none"
                        : isEmerg
                        ? "bg-red-50 text-red-950 border-2 border-red-300 rounded-bl-none"
                        : isMed
                        ? "bg-emerald-50 text-emerald-950 border-2 border-emerald-200 rounded-bl-none"
                        : "bg-rose-50 text-rose-950 border-2 border-rose-200 rounded-bl-none"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span
                        className={`text-[10px] font-black uppercase flex items-center gap-1 ${
                          isUser
                            ? "text-teal-200"
                            : isEmerg
                            ? "text-red-700"
                            : isMed
                            ? "text-emerald-800"
                            : "text-rose-800"
                        }`}
                      >
                        {isUser ? (
                          "👵 You Spoke:"
                        ) : isEmerg ? (
                          <>🚨 AI Emergency Response</>
                        ) : isMed ? (
                          <>💊 AI Medicine Care Response</>
                        ) : (
                          <>🌸 AI Companion Response</>
                        )}
                      </span>
                      <span className={`text-[10px] ${isUser ? "text-teal-300" : "text-stone-400"}`}>
                        {turn.timestamp}
                      </span>
                    </div>
                    <p className="font-semibold text-sm leading-relaxed">{turn.text}</p>
                    {!isUser && (
                      <button
                        id={`btn-replay-turn-${turn.id}`}
                        type="button"
                        onClick={() => {
                          soundFx.playMicClick();
                          speakText(turn.text, patient.languageCode, patient.voiceVolume, patient.voiceSpeed);
                        }}
                        className="mt-1 text-[11px] font-bold text-teal-800 hover:text-teal-950 flex items-center gap-1 cursor-pointer"
                      >
                        <Volume2 size={12} />
                        <span>Hear Again</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ACTIVE MEDICINE DETAILS & HUGE ACTIONS */}
      {activeDose ? (
        <div className="bg-gradient-to-b from-amber-50 to-orange-50/40 rounded-3xl p-5 sm:p-7 border-3 border-amber-300 shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-md text-white font-black text-2xl"
                style={{ backgroundColor: activeDose.pillColor }}
              >
                💊
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-200/70 px-2.5 py-0.5 rounded-full">
                  Scheduled for {activeDose.scheduledTime}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-stone-900 mt-1">
                  {activeDose.medicineName}
                </h2>
                <p className="text-base sm:text-lg font-bold text-amber-900">
                  Dosage: {activeDose.dosage}
                </p>
              </div>
            </div>

            <button
              id="btn-replay-reminder"
              type="button"
              onClick={handleReplayReminder}
              title="Repeat reminder voice"
              className="bg-amber-200 hover:bg-amber-300 text-amber-950 p-3 rounded-2xl flex items-center gap-1.5 text-xs sm:text-sm font-bold cursor-pointer transition-colors shadow-sm"
            >
              <Volume2 size={18} />
              <span className="hidden sm:inline">Hear Again</span>
            </button>
          </div>

          {/* Meal & Food Instruction Pill */}
          <div className="mt-4 bg-white/90 rounded-2xl p-3.5 border border-amber-200 flex items-center gap-3">
            <Utensils className="text-amber-700 shrink-0" size={22} />
            <div className="text-sm sm:text-base font-semibold text-stone-800">
              <span className="font-bold text-amber-950">Instructions: </span>
              {activeDose.instructions}
            </div>
          </div>

          {/* TWO GIANT HIGH-CONTRAST ACTION BUTTONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
            <button
              id="btn-confirm-taken-large"
              type="button"
              onClick={handleManualConfirmTaken}
              className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white py-4 sm:py-5 px-6 rounded-2xl font-black text-lg sm:text-xl shadow-lg border-2 border-emerald-400 flex items-center justify-center gap-3 cursor-pointer transition-all transform active:scale-95"
            >
              <CheckCircle2 size={28} className="text-emerald-200" />
              <span>I Have Taken It</span>
            </button>

            <button
              id="btn-snooze-10min-large"
              type="button"
              onClick={handleManualSnooze}
              className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white py-4 sm:py-5 px-6 rounded-2xl font-black text-base sm:text-lg shadow-lg border-2 border-amber-400 flex items-center justify-center gap-3 cursor-pointer transition-all transform active:scale-95"
            >
              <Clock size={26} className="text-amber-200" />
              <span>I Will Take in 10 Min</span>
            </button>
          </div>
        </div>
      ) : (
        /* No active reminder right now: All clear banner */
        <div className="bg-emerald-50 rounded-3xl p-5 sm:p-6 border-2 border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-xl">
              ✅
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-emerald-950">
                You Are All Caught Up!
              </h3>
              <p className="text-xs sm:text-sm font-medium text-emerald-800">
                Next scheduled medicine will ring automatically.
              </p>
            </div>
          </div>

          <button
            id="btn-test-trigger-8am"
            type="button"
            onClick={() => onTriggerReminder && onTriggerReminder("dose-2")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold cursor-pointer transition-colors shadow-sm"
          >
            ⏰ Trigger 8:30 AM Reminder
          </button>
        </div>
      )}

      {/* TODAY'S MEDICINE TIMELINE LIST */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-stone-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Pill size={20} className="text-teal-700" />
            <h3 className="text-lg sm:text-xl font-extrabold text-stone-900">
              Today's Medicine Schedule
            </h3>
          </div>
          <span className="text-xs font-bold text-stone-500">
            {doses.filter((d) => d.status === "CONFIRMED_TAKEN").length} of {doses.length} Taken
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {doses.map((dose) => {
            const isTaken = dose.status === "CONFIRMED_TAKEN";
            const isPending = dose.status === "PENDING";
            const isActive = dose.id === activeDose?.id;

            return (
              <div
                key={dose.id}
                className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                  isTaken
                    ? "bg-emerald-50/70 border-emerald-200 text-stone-800"
                    : isActive
                    ? "bg-amber-50 border-amber-400 ring-2 ring-amber-300 text-stone-900"
                    : "bg-stone-50 border-stone-200 text-stone-800"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                    style={{ backgroundColor: dose.pillColor }}
                  >
                    💊
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-base sm:text-lg text-stone-900">
                        {dose.medicineName}
                      </span>
                      {isTaken && (
                        <span className="bg-emerald-200 text-emerald-900 text-[11px] font-bold px-2 py-0.5 rounded-full">
                          Taken at {dose.confirmedAt || "8:02 AM"}
                        </span>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm font-medium text-stone-600 mt-0.5">
                      {dose.dosage} • {dose.instructions}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm sm:text-base font-extrabold text-stone-700 font-mono">
                    {dose.scheduledTime}
                  </span>

                  {isTaken ? (
                    <CheckCircle2 size={24} className="text-emerald-600" />
                  ) : (
                    <button
                      id={`btn-dose-trigger-${dose.id}`}
                      type="button"
                      onClick={() => onTriggerReminder && onTriggerReminder(dose.id)}
                      className="bg-stone-200 hover:bg-teal-600 hover:text-white text-stone-700 p-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                      title="Activate this dose reminder"
                    >
                      Ring Now
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM BIG DIRECT ACCESS BUTTONS: TALK TO FAMILY & EMERGENCY SOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Talk to Family button */}
        <button
          id="btn-talk-to-family"
          type="button"
          onClick={() => {
            setIsFamilyMsgOpen(true);
            soundFx.playMicClick();
          }}
          className="bg-gradient-to-r from-teal-700 to-emerald-800 hover:from-teal-600 hover:to-emerald-700 text-white p-5 rounded-3xl shadow-md border-2 border-teal-500 flex items-center justify-between cursor-pointer transition-all active:scale-95"
        >
          <div className="text-left">
            <div className="text-xs font-bold text-teal-200 uppercase tracking-wider">
              Direct Voice Note
            </div>
            <div className="text-lg sm:text-xl font-black mt-0.5">
              Talk to Family
            </div>
            <div className="text-xs text-teal-100 font-medium mt-0.5">
              Send voice message to caregiver
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white">
            <HeartHandshake size={24} />
          </div>
        </button>

        {/* EMERGENCY SOS BUTTON */}
        <button
          id="btn-emergency-sos-patient"
          type="button"
          onClick={handleEmergencySOS}
          className="bg-gradient-to-r from-rose-700 to-red-800 hover:from-rose-600 hover:to-red-700 text-white p-5 rounded-3xl shadow-md border-2 border-rose-400 flex items-center justify-between cursor-pointer transition-all active:scale-95"
        >
          <div className="text-left">
            <div className="text-xs font-bold text-rose-200 uppercase tracking-wider animate-pulse">
              Instant Alert
            </div>
            <div className="text-lg sm:text-xl font-black mt-0.5">
              EMERGENCY SOS
            </div>
            <div className="text-xs text-rose-100 font-medium mt-0.5">
              Call {patient.emergencyContact.name}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white">
            <ShieldAlert size={26} />
          </div>
        </button>
      </div>

      {/* Modal for Speaking to Family */}
      {isFamilyMsgOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-4 border-teal-500 flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                  💬
                </div>
                <div>
                  <h3 className="text-xl font-black text-stone-900">
                    Send Voice Message to Family
                  </h3>
                  <p className="text-xs text-stone-500">
                    Caregiver ({patient.emergencyContact.name}) will receive this immediately
                  </p>
                </div>
              </div>
              <button
                id="btn-close-family-msg"
                onClick={() => setIsFamilyMsgOpen(false)}
                className="text-stone-400 hover:text-stone-700 font-black text-xl p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-sm font-medium text-stone-700">
              Speak or write anything you want to share with your family (e.g. "I am feeling weak today", "Please call me after work", "I need more groceries").
            </p>

            <textarea
              id="input-family-voice-text"
              rows={3}
              value={familyMsgText}
              onChange={(e) => setFamilyMsgText(e.target.value)}
              placeholder="Type or click the microphone to speak your message..."
              className="w-full p-4 text-base font-semibold border-2 border-stone-300 rounded-2xl focus:border-teal-600 focus:outline-none"
            />

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                id="btn-mic-record-family-msg"
                type="button"
                onClick={() => {
                  startListening();
                }}
                className="bg-teal-100 hover:bg-teal-200 text-teal-900 px-4 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 cursor-pointer"
              >
                <Mic size={18} />
                <span>Record with Mic</span>
              </button>

              <button
                id="btn-send-family-msg"
                type="button"
                onClick={() => {
                  if (familyMsgText.trim()) {
                    processPatientVoiceInput(familyMsgText);
                    setFamilyMsgText("");
                    setIsFamilyMsgOpen(false);
                  }
                }}
                className="bg-teal-700 hover:bg-teal-800 text-white px-6 py-3 rounded-2xl font-extrabold text-base shadow-md cursor-pointer"
              >
                Send to Family
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Commands & Help Guide Modal */}
      <VoiceHelpModal
        isOpen={isVoiceHelpOpen}
        onClose={() => setIsVoiceHelpOpen(false)}
        onSelectCommand={(commandText) => {
          setCurrentTranscript(commandText);
          processPatientVoiceInput(commandText);
        }}
        patientLanguage={patient.preferredLanguage}
        languageCode={patient.languageCode}
        patientName={patient.name}
        activeMedicineName={activeDose?.medicineName}
      />
    </div>
  );
};
