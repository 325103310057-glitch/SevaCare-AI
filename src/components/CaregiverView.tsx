import React, { useState, useEffect } from "react";
import {
  Medicine,
  PatientProfile,
  ScheduledDose,
  CaregiverAlert,
  VoiceMessage,
  PillIconType,
  MealTiming,
  SUPPORTED_LANGUAGES,
  ConnectionRequest,
} from "../types";
import { storage } from "../utils/storage";
import { soundFx, speakText } from "../utils/audio";
import { AdherenceAnalytics } from "./AdherenceAnalytics";
import {
  Plus,
  Bell,
  CheckCircle,
  AlertTriangle,
  Clock,
  Pill,
  Send,
  Phone,
  MessageSquare,
  Sparkles,
  Calendar,
  Settings,
  Trash2,
  Edit,
  ShieldAlert,
  Volume2,
  Activity,
  UserCheck,
  RefreshCw,
  Info,
  TrendingUp,
  Link as LinkIcon,
  UserPlus,
  Check,
  X,
} from "lucide-react";

interface CaregiverViewProps {
  patient: PatientProfile;
  medicines: Medicine[];
  doses: ScheduledDose[];
  alerts: CaregiverAlert[];
  messages: VoiceMessage[];
  onUpdateMedicines: (meds: Medicine[]) => void;
  onUpdatePatient: (patient: PatientProfile) => void;
  onTriggerReminder: (doseId: string) => void;
  isCompactDualMode?: boolean;
}

export const CaregiverView: React.FC<CaregiverViewProps> = ({
  patient,
  medicines,
  doses,
  alerts,
  messages,
  onUpdateMedicines,
  onUpdatePatient,
  onTriggerReminder,
  isCompactDualMode = false,
}) => {
  // Navigation tabs inside Caregiver view
  const [activeTab, setActiveTab] = useState<"dashboard" | "analytics" | "schedules" | "alerts" | "messages" | "connections" | "patient_settings">("dashboard");

  // Connection Requests state
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>(storage.getConnectionRequests());
  const [linkPatientPhone, setLinkPatientPhone] = useState<string>("");
  const [linkPatientName, setLinkPatientName] = useState<string>("");
  const [linkRelation, setLinkRelation] = useState<string>("Son");
  const [linkSuccessMsg, setLinkSuccessMsg] = useState<string>("");
  const [linkErrorMsg, setLinkErrorMsg] = useState<string>("");

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setConnectionRequests(storage.getConnectionRequests());
    });
    return () => unsub();
  }, []);

  const handleSendConnectionRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setLinkSuccessMsg("");
    setLinkErrorMsg("");

    const cleanPhone = linkPatientPhone.replace(/[^0-9+]/g, "").trim();
    if (cleanPhone.replace(/[^0-9]/g, "").length < 10) {
      setLinkErrorMsg("Please enter a valid 10-digit patient phone number.");
      return;
    }

    const currentUser = storage.getCurrentUser();
    storage.createConnectionRequest({
      patientId: `patient-${Date.now()}`,
      patientName: linkPatientName.trim() || "Elder Patient",
      patientPhone: cleanPhone,
      caretakerId: currentUser?.id || "caretaker-1",
      caretakerName: currentUser?.name || "Family Caregiver",
      caretakerPhone: currentUser?.phone || "+91 98765 43210",
      relation: linkRelation,
      requestedBy: "CAREGIVER",
    });

    soundFx.playSuccessChime();
    setLinkSuccessMsg(`Connection request sent to ${cleanPhone}. The patient will receive an authorization prompt.`);
    setLinkPatientPhone("");
    setLinkPatientName("");
    setConnectionRequests(storage.getConnectionRequests());
  };

  // Add / Edit Medicine Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [medName, setMedName] = useState<string>("");
  const [medDosage, setMedDosage] = useState<string>("");
  const [medPurpose, setMedPurpose] = useState<string>("");
  const [medTime, setMedTime] = useState<string>("08:00");
  const [medMealTiming, setMedMealTiming] = useState<MealTiming>("AFTER_MEAL");
  const [medInstructions, setMedInstructions] = useState<string>("");
  const [medPillColor, setMedPillColor] = useState<string>("#f59e0b");
  const [medIconType, setMedIconType] = useState<PillIconType>("tablet");
  const [medTotalPills, setMedTotalPills] = useState<number>(30);

  // AI Schedule helper prompt
  const [aiPrescriptionText, setAiPrescriptionText] = useState<string>("");
  const [isAiParsing, setIsAiParsing] = useState<boolean>(false);

  // Caregiver Reply Message
  const [replyText, setReplyText] = useState<string>("");

  // Statistics calculation
  const totalDosesToday = doses.length;
  const takenDosesToday = doses.filter((d) => d.status === "CONFIRMED_TAKEN").length;
  const missedDosesToday = doses.filter((d) => d.status === "MISSED" || d.status === "CARE_ALERTED").length;
  const pendingDosesToday = doses.filter((d) => d.status === "PENDING" || d.status === "WAITING_10_MIN").length;
  const adherenceRate = totalDosesToday > 0 ? Math.round((takenDosesToday / totalDosesToday) * 100) : 100;
  const unreadAlerts = alerts.filter((a) => !a.acknowledged);

  // Handle Save Medicine
  const handleSaveMedicine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName.trim() || !medDosage.trim()) return;

    if (editingMedId) {
      const updated = medicines.map((m) =>
        m.id === editingMedId
          ? {
              ...m,
              name: medName,
              dosage: medDosage,
              purpose: medPurpose,
              times: [medTime],
              mealTiming: medMealTiming,
              instructions: medInstructions,
              pillColor: medPillColor,
              iconType: medIconType,
              totalPills: medTotalPills,
            }
          : m
      );
      onUpdateMedicines(updated);
    } else {
      const newMed: Medicine = {
        id: `med-${Date.now()}`,
        name: medName,
        dosage: medDosage,
        purpose: medPurpose || "General Wellness",
        scheduleType: "DAILY",
        times: [medTime],
        mealTiming: medMealTiming,
        instructions: medInstructions || "Take with fresh water",
        pillColor: medPillColor,
        iconType: medIconType,
        remainingPills: medTotalPills,
        totalPills: medTotalPills,
        active: true,
      };
      onUpdateMedicines([...medicines, newMed]);
    }

    resetForm();
    setIsAddModalOpen(false);
  };

  const resetForm = () => {
    setEditingMedId(null);
    setMedName("");
    setMedDosage("");
    setMedPurpose("");
    setMedTime("08:00");
    setMedMealTiming("AFTER_MEAL");
    setMedInstructions("");
    setMedPillColor("#f59e0b");
    setMedIconType("tablet");
    setMedTotalPills(30);
  };

  const openEditModal = (med: Medicine) => {
    setEditingMedId(med.id);
    setMedName(med.name);
    setMedDosage(med.dosage);
    setMedPurpose(med.purpose);
    setMedTime(med.times[0] || "08:00");
    setMedMealTiming(med.mealTiming);
    setMedInstructions(med.instructions);
    setMedPillColor(med.pillColor);
    setMedIconType(med.iconType);
    setMedTotalPills(med.totalPills);
    setIsAddModalOpen(true);
  };

  const handleDeleteMed = (id: string) => {
    if (confirm("Are you sure you want to remove this medicine schedule?")) {
      onUpdateMedicines(medicines.filter((m) => m.id !== id));
    }
  };

  // AI Prescription Auto-Filler
  const handleParsePrescriptionWithAI = async () => {
    if (!aiPrescriptionText.trim()) return;
    setIsAiParsing(true);

    try {
      // Local smart parser for instant responsiveness
      const text = aiPrescriptionText.toLowerCase();
      let detectedName = "Prescribed Tablet";
      let detectedDosage = "1 tablet";
      let detectedTime = "08:00";
      let detectedMeal: MealTiming = "AFTER_MEAL";
      let detectedInstructions = "Take with warm water after breakfast";
      let color = "#3b82f6";

      if (text.includes("bp") || text.includes("amlodipine") || text.includes("telmisartan")) {
        detectedName = "Telmisartan (Blood Pressure)";
        detectedDosage = "40 mg • 1 tablet";
        color = "#f59e0b";
      } else if (text.includes("sugar") || text.includes("diabetes") || text.includes("metformin")) {
        detectedName = "Metformin (Diabetes)";
        detectedDosage = "500 mg • 1 tablet";
        detectedMeal = "WITH_MEAL";
        detectedInstructions = "Take with main meal";
        color = "#3b82f6";
      } else if (text.includes("pain") || text.includes("paracetamol") || text.includes("crocin")) {
        detectedName = "Paracetamol (Pain Relief)";
        detectedDosage = "650 mg • 1 tablet";
        color = "#ef4444";
      }

      if (text.includes("night") || text.includes("bedtime") || text.includes("dinner") || text.includes("evening")) {
        detectedTime = "20:30";
      } else if (text.includes("lunch") || text.includes("afternoon")) {
        detectedTime = "13:00";
      }

      setMedName(detectedName);
      setMedDosage(detectedDosage);
      setMedTime(detectedTime);
      setMedMealTiming(detectedMeal);
      setMedInstructions(detectedInstructions);
      setMedPillColor(color);
      setAiPrescriptionText("");
    } finally {
      setIsAiParsing(false);
    }
  };

  // Caregiver acknowledges alert
  const handleAcknowledgeAlert = (alertId: string) => {
    const updated = alerts.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a));
    storage.saveAlerts(updated);
  };

  // Caregiver sends warm voice note to patient
  const handleSendCaregiverMessage = () => {
    if (!replyText.trim()) return;
    storage.addMessage({
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sender: "CAREGIVER",
      text: replyText,
      language: patient.preferredLanguage,
      urgency: "NORMAL",
    });

    // Speak aloud on patient's device
    speakText(
      `Message from your family: ${replyText}`,
      patient.languageCode,
      patient.voiceVolume
    );

    setReplyText("");
  };

  return (
    <div className={`w-full max-w-4xl mx-auto flex flex-col gap-5 ${isCompactDualMode ? "p-3" : "p-4 sm:p-6"}`}>
      {/* Top Patient Live Status Bar */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border-2 border-stone-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 border-2 border-teal-300 text-teal-800 flex items-center justify-center font-black text-xl">
            👵
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-stone-900">{patient.name}</h2>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Connected
              </span>
            </div>
            <div className="text-xs text-stone-500 font-medium mt-0.5 flex items-center gap-2">
              <span>{patient.relation} • Age {patient.age}</span>
              <span>•</span>
              <span>📍 {patient.location}</span>
            </div>
          </div>
        </div>

        {/* Quick Contact & Emergency Call Actions */}
        <div className="flex items-center gap-2.5">
          <a
            href={`tel:${patient.phone}`}
            id="btn-call-patient"
            className="bg-teal-50 hover:bg-teal-100 text-teal-800 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-teal-200 cursor-pointer"
          >
            <Phone size={15} />
            <span>Call Patient</span>
          </a>

          <button
            id="btn-trigger-test-reminder"
            type="button"
            onClick={() => onTriggerReminder("dose-1")}
            className="bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Bell size={15} />
            <span>Trigger Voice Reminder</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
        {[
          { id: "dashboard", label: "📊 Today's Monitor", count: null },
          { id: "analytics", label: "📈 30-Day Adherence Trends", count: null },
          { id: "alerts", label: "🚨 Urgent Alerts", count: unreadAlerts.length },
          { id: "schedules", label: "💊 Medicine Schedules", count: medicines.length },
          { id: "messages", label: "💬 Voice Messages", count: messages.length },
          { id: "connections", label: "🔗 Linked Patients", count: connectionRequests.filter(c => c.status === "PENDING").length },
          { id: "patient_settings", label: "⚙️ Patient Settings", count: null },
        ].map((tab) => (
          <button
            key={tab.id}
            id={`tab-caregiver-${tab.id}`}
            type="button"
            onClick={() => {
              setActiveTab(tab.id as any);
              soundFx.playMicClick();
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? "bg-teal-700 text-white shadow-sm"
                : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && tab.count > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  tab.id === "alerts"
                    ? "bg-rose-500 text-white animate-bounce"
                    : activeTab === tab.id
                    ? "bg-teal-900 text-teal-100"
                    : "bg-stone-200 text-stone-700"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: TODAY'S MONITOR & ADHERENCE TIMELINE */}
      {activeTab === "dashboard" && (
        <div className="flex flex-col gap-5">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border-2 border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase">Today's Adherence</span>
              <div className="text-2xl sm:text-3xl font-black text-teal-800 mt-1 font-mono">
                {adherenceRate}%
              </div>
              <span className="text-[11px] font-medium text-emerald-600 mt-0.5 block">
                {takenDosesToday} of {totalDosesToday} doses taken
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border-2 border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase">Taken On Time</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1 font-mono">
                {takenDosesToday}
              </div>
              <span className="text-[11px] font-medium text-stone-500 mt-0.5 block">
                Verified via AI voice
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border-2 border-stone-200 shadow-xs">
              <span className="text-xs font-bold text-stone-500 uppercase">Pending Today</span>
              <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-1 font-mono">
                {pendingDosesToday}
              </div>
              <span className="text-[11px] font-medium text-stone-500 mt-0.5 block">
                Scheduled for later
              </span>
            </div>

            <div className={`p-4 rounded-2xl border-2 shadow-xs ${
              missedDosesToday > 0 ? "bg-rose-50 border-rose-300" : "bg-white border-stone-200"
            }`}>
              <span className="text-xs font-bold text-stone-500 uppercase">Missed / Alerted</span>
              <div className={`text-2xl sm:text-3xl font-black mt-1 font-mono ${
                missedDosesToday > 0 ? "text-rose-700" : "text-stone-700"
              }`}>
                {missedDosesToday}
              </div>
              <span className="text-[11px] font-medium text-stone-500 mt-0.5 block">
                {missedDosesToday > 0 ? "Needs family check" : "Zero missed doses"}
              </span>
            </div>
          </div>

          {/* Real-time Dose Status Timeline */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-stone-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="text-teal-700" size={20} />
                <h3 className="text-lg font-extrabold text-stone-900">
                  Today's Medicine Adherence Timeline
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("analytics")}
                className="text-xs font-bold text-teal-800 hover:text-teal-950 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
              >
                <TrendingUp size={14} />
                <span>View 30-Day Trends</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {doses.map((dose) => (
                <div
                  key={dose.id}
                  className={`p-4 rounded-2xl border-2 flex items-center justify-between ${
                    dose.status === "CONFIRMED_TAKEN"
                      ? "bg-emerald-50/70 border-emerald-200"
                      : dose.status === "CARE_ALERTED"
                      ? "bg-rose-50 border-rose-300 ring-2 ring-rose-200"
                      : dose.status === "WAITING_10_MIN" || dose.status === "REMINDING_STAGE_2"
                      ? "bg-amber-50 border-amber-300"
                      : "bg-stone-50 border-stone-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-xs"
                      style={{ backgroundColor: dose.pillColor }}
                    >
                      💊
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-stone-900">
                          {dose.medicineName}
                        </span>
                        <span className="text-xs font-mono font-bold text-stone-500">
                          ({dose.scheduledTime})
                        </span>
                      </div>
                      <div className="text-xs font-medium text-stone-600 mt-0.5">
                        {dose.dosage} • {dose.instructions}
                      </div>
                      {dose.patientResponse && (
                        <div className="text-xs font-bold text-teal-800 bg-white/80 border border-teal-200 px-2 py-0.5 rounded-md mt-1 inline-block">
                          🗣️ Patient Voice: "{dose.patientResponse}"
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    {dose.status === "CONFIRMED_TAKEN" && (
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1">
                        <CheckCircle size={14} />
                        Taken at {dose.confirmedAt || "8:02 AM"}
                      </span>
                    )}
                    {dose.status === "CARE_ALERTED" && (
                      <span className="bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm">
                        <AlertTriangle size={14} />
                        Missed Dose Alert
                      </span>
                    )}
                    {dose.status === "WAITING_10_MIN" && (
                      <span className="bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1">
                        <Clock size={14} />
                        Snoozed 10 Min
                      </span>
                    )}
                    {dose.status === "PENDING" && (
                      <span className="bg-stone-200 text-stone-700 text-xs font-bold px-3 py-1.5 rounded-xl">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 30-Day Adherence Analytics Visualizer */}
          <AdherenceAnalytics
            patient={patient}
            medicines={medicines}
            currentDoses={doses}
          />
        </div>
      )}

      {/* TAB 2: DEDICATED 30-DAY ANALYTICS TAB */}
      {activeTab === "analytics" && (
        <div className="flex flex-col gap-5">
          <AdherenceAnalytics
            patient={patient}
            medicines={medicines}
            currentDoses={doses}
          />
        </div>
      )}

      {/* TAB 2: ALERTS FEED */}
      {activeTab === "alerts" && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-stone-200 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="text-rose-600" size={22} />
              <h3 className="text-lg font-extrabold text-stone-900">
                Caregiver Alerts & Urgent Notifications
              </h3>
            </div>
            <span className="text-xs font-bold text-stone-500">
              {alerts.length} Total Logs
            </span>
          </div>

          {alerts.length === 0 ? (
            <div className="text-center py-10 text-stone-500 font-medium">
              No alerts at this moment. Everything is on track!
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {alerts.map((alert) => {
                const isEmergency = alert.priority === "EMERGENCY";
                const isUrgent = alert.priority === "URGENT";
                const isWarning = alert.priority === "WARNING";

                return (
                  <div
                    key={alert.id}
                    className={`p-4 sm:p-5 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isEmergency
                        ? "bg-rose-50 border-rose-400 ring-2 ring-rose-300"
                        : isUrgent
                        ? "bg-orange-50 border-orange-300 ring-1 ring-orange-200"
                        : isWarning
                        ? "bg-amber-50 border-amber-200"
                        : "bg-stone-50 border-stone-200"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 text-white ${
                          isEmergency
                            ? "bg-rose-600"
                            : isUrgent
                            ? "bg-orange-600"
                            : isWarning
                            ? "bg-amber-600"
                            : "bg-teal-600"
                        }`}
                      >
                        {isEmergency ? "🚨" : isUrgent ? "⚠️" : isWarning ? "📦" : "✅"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-base text-stone-900">
                            {alert.title}
                          </h4>
                          {alert.category && (
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              alert.category === "emergency help"
                                ? "bg-red-100 text-red-800 border border-red-300"
                                : alert.category === "medicine status update"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-rose-100 text-rose-800 border border-rose-300"
                            }`}>
                              {alert.category}
                            </span>
                          )}
                          <span className="text-[11px] font-bold text-stone-500 font-mono">
                            {alert.timestamp}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-stone-700 mt-1">
                          {alert.message}
                        </p>
                        {alert.transcript && (
                          <div className="mt-2 bg-white/90 border border-stone-300 rounded-xl p-2.5 text-xs text-stone-800 font-medium">
                            <span className="font-bold text-stone-900">Patient Voice: </span>
                            "{alert.transcript}"
                          </div>
                        )}
                        {alert.symptomSummary && (
                          <div className="mt-1.5 text-xs font-bold text-rose-800">
                            🩺 Health note: {alert.symptomSummary}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        id={`btn-listen-alert-${alert.id}`}
                        type="button"
                        onClick={() => speakText(alert.transcript || alert.message)}
                        className="bg-white hover:bg-stone-100 text-stone-800 p-2.5 rounded-xl border border-stone-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Listen to transcription"
                      >
                        <Volume2 size={16} />
                      </button>

                      <a
                        href={`tel:${patient.phone}`}
                        id={`btn-call-from-alert-${alert.id}`}
                        className="bg-teal-700 hover:bg-teal-800 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Phone size={14} />
                        <span>Call</span>
                      </a>

                      {!alert.acknowledged && (
                        <button
                          id={`btn-ack-alert-${alert.id}`}
                          type="button"
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MEDICINE SCHEDULES & ADD/EDIT */}
      {activeTab === "schedules" && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-stone-200 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pill className="text-teal-700" size={22} />
              <h3 className="text-lg font-extrabold text-stone-900">
                Configured Medicine Schedules
              </h3>
            </div>

            <button
              id="btn-open-add-med-modal"
              type="button"
              onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}
              className="bg-teal-700 hover:bg-teal-800 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus size={18} />
              <span>Add Medicine</span>
            </button>
          </div>

          {/* List of configured medicines */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {medicines.map((med) => (
              <div
                key={med.id}
                className="p-4 rounded-2xl border-2 border-stone-200 bg-stone-50 flex flex-col justify-between gap-3 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-xs"
                      style={{ backgroundColor: med.pillColor }}
                    >
                      💊
                    </div>
                    <div>
                      <h4 className="font-black text-base text-stone-900">{med.name}</h4>
                      <p className="text-xs font-bold text-teal-800">
                        {med.dosage} • {med.purpose}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      id={`btn-edit-med-${med.id}`}
                      type="button"
                      onClick={() => openEditModal(med)}
                      className="p-1.5 text-stone-500 hover:text-teal-700 cursor-pointer"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      id={`btn-delete-med-${med.id}`}
                      type="button"
                      onClick={() => handleDeleteMed(med.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="text-xs font-semibold text-stone-600 space-y-1 bg-white p-3 rounded-xl border border-stone-200">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Times:</span>
                    <span className="font-bold font-mono text-stone-900">
                      {med.times.join(", ")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Meal Relation:</span>
                    <span className="font-bold text-stone-900">
                      {med.mealTiming.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Instructions:</span>
                    <span className="font-medium text-stone-900">{med.instructions}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                    <span className="text-stone-500">Stock Pills Remaining:</span>
                    <span className="font-bold text-emerald-700">
                      {med.remainingPills} / {med.totalPills}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: TWO-WAY VOICE & MESSAGE HUB */}
      {activeTab === "messages" && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-stone-200 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="text-teal-700" size={22} />
              <h3 className="text-lg font-extrabold text-stone-900">
                Patient & Caregiver Voice Messaging
              </h3>
            </div>
            <span className="text-xs font-medium text-stone-500">
              Messages speak aloud automatically on patient's device
            </span>
          </div>

          {/* Messages Feed */}
          <div className="flex flex-col gap-3 max-h-96 overflow-y-auto p-2 bg-stone-50 rounded-2xl border border-stone-200">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-stone-400 font-medium text-sm">
                No voice notes exchanged yet. Send a message below!
              </div>
            ) : (
              messages.map((msg) => {
                const isFromPatient = msg.sender === "PATIENT";
                return (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-2xl max-w-lg flex flex-col gap-1 ${
                      isFromPatient
                        ? "bg-teal-50 border-2 border-teal-200 self-start text-stone-900"
                        : "bg-emerald-600 text-white self-end shadow-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-xs font-bold">
                      <span className={isFromPatient ? "text-teal-900" : "text-emerald-200"}>
                        {isFromPatient ? `👵 ${patient.name}` : "🧑 Caregiver (You)"}
                      </span>
                      <span className={`text-[10px] font-mono ${isFromPatient ? "text-stone-500" : "text-emerald-100"}`}>
                        {msg.timestamp}
                      </span>
                    </div>

                    <p className="text-sm font-semibold mt-1">
                      "{msg.text}"
                    </p>

                    {msg.translation && (
                      <p className="text-xs italic text-stone-600 mt-0.5">
                        (Translation: {msg.translation})
                      </p>
                    )}

                    <div className="self-end mt-1">
                      <button
                        id={`btn-play-msg-${msg.id}`}
                        type="button"
                        onClick={() => speakText(msg.text, patient.languageCode)}
                        className={`text-xs font-bold p-1 rounded-md flex items-center gap-1 cursor-pointer ${
                          isFromPatient ? "text-teal-800 hover:bg-teal-100" : "text-emerald-100 hover:bg-emerald-700"
                        }`}
                      >
                        <Volume2 size={14} />
                        <span>Play Audio</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Send Message Input */}
          <div className="flex items-center gap-2 pt-2">
            <input
              id="input-caregiver-reply-text"
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Send a voice note to ${patient.name.split(" ")[0]} (e.g. 'Amma, drink water after pills')...`}
              className="flex-1 p-3.5 text-sm font-semibold border-2 border-stone-300 rounded-2xl focus:border-teal-600 focus:outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleSendCaregiverMessage()}
            />
            <button
              id="btn-send-caregiver-reply"
              type="button"
              onClick={handleSendCaregiverMessage}
              className="bg-teal-700 hover:bg-teal-800 text-white px-5 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Send size={16} />
              <span>Send Voice</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB: LINKED PATIENTS & CONNECTION REQUESTS */}
      {activeTab === "connections" && (
        <div className="flex flex-col gap-6">
          {/* Active Linked Patient Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-stone-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-100 border-2 border-teal-300 text-teal-900 font-black text-2xl flex items-center justify-center">
                👵
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    ● Active Linked Senior
                  </span>
                  <span className="text-xs text-stone-500 font-medium">Verified Authorization</span>
                </div>
                <h3 className="text-xl font-extrabold text-stone-900 mt-1">{patient.name}</h3>
                <p className="text-xs text-stone-600 font-medium mt-0.5">
                  Phone: <span className="font-bold text-stone-800">{patient.phone}</span> • Preferred Voice Language: <span className="font-bold text-stone-800">{patient.preferredLanguage}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                id="btn-switch-to-monitor"
                type="button"
                onClick={() => {
                  setActiveTab("dashboard");
                  soundFx.playMicClick();
                }}
                className="flex-1 sm:flex-none bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer shadow-sm"
              >
                View Live Vitals & Adherence
              </button>
            </div>
          </div>

          {/* Send New Connection Request */}
          <div className="bg-stone-50 border-2 border-stone-200 rounded-3xl p-5 sm:p-6">
            <div className="flex items-center gap-2.5 mb-2">
              <UserPlus className="text-teal-700" size={22} />
              <h3 className="text-lg font-black text-stone-900">
                Link Another Senior Citizen / Patient
              </h3>
            </div>
            <p className="text-xs text-stone-600 mb-4">
              Enter the patient's phone number to send an authorization request. The patient will see an approval prompt in their Senior Portal.
            </p>

            {linkSuccessMsg && (
              <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold p-3 rounded-xl mb-4">
                ✓ {linkSuccessMsg}
              </div>
            )}
            {linkErrorMsg && (
              <div className="bg-rose-100 border border-rose-300 text-rose-900 text-xs font-bold p-3 rounded-xl mb-4">
                ⚠️ {linkErrorMsg}
              </div>
            )}

            <form onSubmit={handleSendConnectionRequest} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-stone-700 uppercase">Patient Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={linkPatientPhone}
                  onChange={(e) => setLinkPatientPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full mt-1 p-2.5 text-xs sm:text-sm font-bold bg-white border border-stone-300 rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 uppercase">Patient Full Name</label>
                <input
                  type="text"
                  value={linkPatientName}
                  onChange={(e) => setLinkPatientName(e.target.value)}
                  placeholder="e.g. Grandma Kamala"
                  className="w-full mt-1 p-2.5 text-xs sm:text-sm font-bold bg-white border border-stone-300 rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 uppercase">Your Relationship</label>
                <div className="flex gap-2 mt-1">
                  <select
                    value={linkRelation}
                    onChange={(e) => setLinkRelation(e.target.value)}
                    className="flex-1 p-2.5 text-xs sm:text-sm font-bold bg-white border border-stone-300 rounded-xl"
                  >
                    <option value="Son">Son</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Grandchild">Grandchild</option>
                    <option value="Professional Caregiver">Professional Caregiver</option>
                    <option value="Doctor / Nurse">Doctor / Nurse</option>
                    <option value="Guardian">Guardian</option>
                  </select>
                  <button
                    id="btn-submit-link-request"
                    type="submit"
                    className="bg-teal-700 hover:bg-teal-800 text-white px-4 py-2.5 rounded-xl text-xs font-black cursor-pointer shadow-sm whitespace-nowrap"
                  >
                    Send Request
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Connection Requests List */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-stone-200 shadow-sm flex flex-col gap-4">
            <h4 className="text-base font-extrabold text-stone-900">
              Connection Requests & Status Log
            </h4>

            {connectionRequests.length === 0 ? (
              <p className="text-xs text-stone-500 italic py-3 text-center">
                No outgoing connection requests yet.
              </p>
            ) : (
              <div className="divide-y divide-stone-200">
                {connectionRequests.map((req) => (
                  <div key={req.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-stone-900">
                        {req.patientName} <span className="text-xs text-stone-500 font-normal">({req.patientPhone})</span>
                      </div>
                      <div className="text-xs text-stone-600">
                        Role: {req.relation} • Requested on {new Date(req.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <span
                      className={`text-xs font-black px-3 py-1 rounded-full uppercase ${
                        req.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : req.status === "REJECTED"
                          ? "bg-rose-100 text-rose-800 border border-rose-300"
                          : "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
                      }`}
                    >
                      {req.status === "APPROVED" ? "✓ Authorized" : req.status === "REJECTED" ? "✕ Declined" : "⏳ Pending Approval"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: PATIENT SETTINGS */}
      {activeTab === "patient_settings" && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-stone-200 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Settings className="text-teal-700" size={22} />
            <h3 className="text-lg font-extrabold text-stone-900">
              Elderly Patient Profile & Language Settings
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase">Patient Full Name</label>
              <input
                type="text"
                value={patient.name}
                onChange={(e) => onUpdatePatient({ ...patient, name: e.target.value })}
                className="w-full mt-1 p-3 text-sm font-bold border border-stone-300 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 uppercase">Primary Spoken Language</label>
              <select
                value={patient.preferredLanguage}
                onChange={(e) => {
                  const selected = SUPPORTED_LANGUAGES.find((l) => l.name === e.target.value);
                  if (selected) {
                    onUpdatePatient({
                      ...patient,
                      preferredLanguage: selected.name,
                      languageCode: selected.speechCode,
                    });
                  }
                }}
                className="w-full mt-1 p-3 text-sm font-bold border border-stone-300 rounded-xl"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.name}>
                    {lang.flag} {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 uppercase">Emergency Contact Name</label>
              <input
                type="text"
                value={patient.emergencyContact.name}
                onChange={(e) =>
                  onUpdatePatient({
                    ...patient,
                    emergencyContact: { ...patient.emergencyContact, name: e.target.value },
                  })
                }
                className="w-full mt-1 p-3 text-sm font-bold border border-stone-300 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 uppercase">Emergency Contact Phone</label>
              <input
                type="text"
                value={patient.emergencyContact.phone}
                onChange={(e) =>
                  onUpdatePatient({
                    ...patient,
                    emergencyContact: { ...patient.emergencyContact, phone: e.target.value },
                  })
                }
                className="w-full mt-1 p-3 text-sm font-bold border border-stone-300 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 uppercase">Physician / Doctor</label>
              <input
                type="text"
                value={patient.doctorContact.name}
                onChange={(e) =>
                  onUpdatePatient({
                    ...patient,
                    doctorContact: { ...patient.doctorContact, name: e.target.value },
                  })
                }
                className="w-full mt-1 p-3 text-sm font-bold border border-stone-300 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 uppercase">Doctor Phone</label>
              <input
                type="text"
                value={patient.doctorContact.phone}
                onChange={(e) =>
                  onUpdatePatient({
                    ...patient,
                    doctorContact: { ...patient.doctorContact, phone: e.target.value },
                  })
                }
                className="w-full mt-1 p-3 text-sm font-bold border border-stone-300 rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT MEDICINE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border-4 border-teal-600 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="text-xl font-black text-stone-900">
                {editingMedId ? "Edit Medicine Schedule" : "Add New Medicine Schedule"}
              </h3>
              <button
                id="btn-close-add-modal"
                onClick={() => setIsAddModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 font-bold text-xl p-1"
              >
                ✕
              </button>
            </div>

            {/* Smart AI Prescription Assistant */}
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-3.5 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                <Sparkles size={16} className="text-teal-700" />
                <span>AI Smart Auto-Fill from Prescription:</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiPrescriptionText}
                  onChange={(e) => setAiPrescriptionText(e.target.value)}
                  placeholder="e.g. 'Metformin 500mg after dinner' or 'Amlodipine 5mg morning'"
                  className="flex-1 text-xs p-2.5 bg-white border border-teal-300 rounded-xl"
                />
                <button
                  id="btn-parse-ai-prescription"
                  type="button"
                  onClick={handleParsePrescriptionWithAI}
                  disabled={isAiParsing}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-3 py-2 rounded-xl cursor-pointer"
                >
                  {isAiParsing ? "Parsing..." : "Auto-Fill"}
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveMedicine} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700 uppercase">Medicine Name</label>
                <input
                  id="input-med-name"
                  type="text"
                  required
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  placeholder="e.g. Amlodipine (Blood Pressure)"
                  className="w-full mt-1 p-3 text-sm font-semibold border border-stone-300 rounded-xl focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 uppercase">Dosage</label>
                  <input
                    id="input-med-dosage"
                    type="text"
                    required
                    value={medDosage}
                    onChange={(e) => setMedDosage(e.target.value)}
                    placeholder="e.g. 5 mg • 1 tablet"
                    className="w-full mt-1 p-3 text-sm font-semibold border border-stone-300 rounded-xl focus:border-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 uppercase">Reminder Time</label>
                  <input
                    id="input-med-time"
                    type="time"
                    required
                    value={medTime}
                    onChange={(e) => setMedTime(e.target.value)}
                    className="w-full mt-1 p-3 text-sm font-bold border border-stone-300 rounded-xl font-mono focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 uppercase">Meal Timing</label>
                  <select
                    id="select-med-meal"
                    value={medMealTiming}
                    onChange={(e) => setMedMealTiming(e.target.value as MealTiming)}
                    className="w-full mt-1 p-3 text-sm font-semibold border border-stone-300 rounded-xl focus:border-teal-600 focus:outline-none"
                  >
                    <option value="AFTER_MEAL">After Meal</option>
                    <option value="BEFORE_MEAL">Before Meal</option>
                    <option value="WITH_MEAL">With Meal</option>
                    <option value="ANYTIME">Anytime</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 uppercase">Pill Visual Color</label>
                  <div className="flex items-center gap-2 mt-1">
                    {["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#ec4899"].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setMedPillColor(color)}
                        className={`w-8 h-8 rounded-full cursor-pointer transition-transform ${
                          medPillColor === color ? "ring-4 ring-teal-500 scale-110" : ""
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 uppercase">Instructions for Elderly Patient</label>
                <input
                  id="input-med-instructions"
                  type="text"
                  value={medInstructions}
                  onChange={(e) => setMedInstructions(e.target.value)}
                  placeholder="e.g. Take with half glass of warm water after breakfast"
                  className="w-full mt-1 p-3 text-sm font-semibold border border-stone-300 rounded-xl focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-med"
                  type="submit"
                  className="bg-teal-700 hover:bg-teal-800 text-white px-6 py-2.5 rounded-xl font-extrabold text-sm shadow-md cursor-pointer"
                >
                  {editingMedId ? "Update Schedule" : "Save Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
