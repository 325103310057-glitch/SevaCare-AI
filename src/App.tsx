import React, { useState, useEffect } from "react";
import {
  RoleMode,
  Medicine,
  PatientProfile,
  ScheduledDose,
  CaregiverAlert,
  VoiceMessage,
  UserAccount,
  UserRole,
} from "./types";
import { storage } from "./utils/storage";
import { Header } from "./components/Header";
import { PatientView } from "./components/PatientView";
import { CaregiverView } from "./components/CaregiverView";
import { DualDeviceView } from "./components/DualDeviceView";
import { AdminView } from "./components/AdminView";
import { AuthView } from "./components/AuthView";
import { GeminiAssistantPanel } from "./components/GeminiAssistantPanel";
import { soundFx, speakText } from "./utils/audio";

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(storage.getCurrentUser());
  const [isGeminiSuiteOpen, setIsGeminiSuiteOpen] = useState<boolean>(false);
  const [roleMode, setRoleMode] = useState<RoleMode>(
    storage.getCurrentUser()?.role === "ADMIN"
      ? "ADMIN"
      : storage.getCurrentUser()?.role === "CAREGIVER"
      ? "CAREGIVER"
      : "PATIENT"
  );
  const [patient, setPatient] = useState<PatientProfile>(storage.getPatient());
  const [medicines, setMedicines] = useState<Medicine[]>(storage.getMedicines());
  const [doses, setDoses] = useState<ScheduledDose[]>(storage.getDoses());
  const [alerts, setAlerts] = useState<CaregiverAlert[]>(storage.getAlerts());
  const [messages, setMessages] = useState<VoiceMessage[]>(storage.getMessages());
  const [activeDoseId, setActiveDoseId] = useState<string | null>("dose-2");

  // Subscribe to storage changes for multi-component and dual-device sync
  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setPatient(storage.getPatient());
      setMedicines(storage.getMedicines());
      setDoses(storage.getDoses());
      setAlerts(storage.getAlerts());
      setMessages(storage.getMessages());
      setCurrentUser(storage.getCurrentUser());
    });
    return () => unsubscribe();
  }, []);

  // Handle successful login or registration
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    if (user.role === "ADMIN") {
      setRoleMode("ADMIN");
    } else if (user.role === "CAREGIVER") {
      setRoleMode("CAREGIVER");
    } else {
      setRoleMode("PATIENT");
    }
  };

  // Handle switch user account
  const handleSwitchUser = (user: UserAccount) => {
    storage.setCurrentUser(user);
    setCurrentUser(user);
    if (user.role === "ADMIN") {
      setRoleMode("ADMIN");
    } else if (user.role === "CAREGIVER") {
      setRoleMode("CAREGIVER");
    } else {
      setRoleMode("PATIENT");
    }
  };

  // Handle Logout
  const handleLogout = () => {
    if (currentUser) {
      storage.addAuditLog({
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: "USER_LOGOUT",
        target: currentUser.email,
        details: `User logged out`,
        severity: "INFO",
      });
    }
    storage.setCurrentUser(null);
    setCurrentUser(null);
    soundFx.playTap();
  };

  // Update single dose
  const handleUpdateDose = (updatedDose: ScheduledDose) => {
    const currentDoses = storage.getDoses();
    const newDoses = currentDoses.map((d) => (d.id === updatedDose.id ? updatedDose : d));
    storage.saveDoses(newDoses);
    setDoses(newDoses);
    if (updatedDose.status === "CONFIRMED_TAKEN") {
      setActiveDoseId(null);
    }
  };

  // Update medicines list
  const handleUpdateMedicines = (newMeds: Medicine[]) => {
    storage.saveMedicines(newMeds);
    setMedicines(newMeds);
  };

  // Update patient profile
  const handleUpdatePatient = (newPatient: PatientProfile) => {
    storage.savePatient(newPatient);
    setPatient(newPatient);
  };

  // Update language
  const handleUpdateLanguage = (langName: string, langCode: string) => {
    const updated = {
      ...patient,
      preferredLanguage: langName,
      languageCode: langCode,
    };
    storage.savePatient(updated);
    setPatient(updated);
  };

  // Trigger voice reminder for a specific dose
  const handleTriggerReminder = (doseId: string) => {
    const currentDoses = storage.getDoses();
    const target = currentDoses.find((d) => d.id === doseId);
    if (!target) return;

    const updated = currentDoses.map((d) =>
      d.id === doseId
        ? {
            ...d,
            status: "REMINDING_STAGE_1" as const,
            stage: 1 as const,
            firstRemindedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }
        : d
    );
    storage.saveDoses(updated);
    setDoses(updated);
    setActiveDoseId(doseId);
  };

  // Reset to default seed data
  const handleResetData = () => {
    if (confirm("Reset all medicines, doses, and logs to sample initial demo state?")) {
      storage.resetToDefaults();
      setPatient(storage.getPatient());
      setMedicines(storage.getMedicines());
      setDoses(storage.getDoses());
      setAlerts(storage.getAlerts());
      setMessages(storage.getMessages());
      setActiveDoseId("dose-2");
      soundFx.playSuccessChime();
    }
  };

  // Execute interactive simulation scenarios
  const handleSimulateScenario = (scenarioType: string) => {
    const currentDoses = storage.getDoses();
    const targetDose = currentDoses.find((d) => d.id === "dose-2") || currentDoses[0];

    switch (scenarioType) {
      case "TRIGGER_REMINDER": {
        handleTriggerReminder(targetDose.id);
        break;
      }
      case "VOICE_TAKEN": {
        soundFx.playSuccessChime();
        const updated = currentDoses.map((d) =>
          d.id === targetDose.id
            ? {
                ...d,
                status: "CONFIRMED_TAKEN" as const,
                confirmedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                patientResponse: "I have taken my Metformin medicine with morning breakfast.",
              }
            : d
        );
        storage.saveDoses(updated);
        storage.addAlert({
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          type: "CONFIRMED",
          priority: "INFO",
          title: "Medicine Taken Confirmed",
          message: `${patient.name} confirmed taking ${targetDose.medicineName} (${targetDose.dosage}).`,
          patientName: patient.name,
          medicineName: targetDose.medicineName,
          transcript: "I have taken my Metformin medicine with morning breakfast.",
          acknowledged: true,
        });
        setActiveDoseId(null);
        speakText(
          `Great! I have recorded that you took your ${targetDose.medicineName}. Stay healthy!`,
          patient.languageCode,
          patient.voiceVolume
        );
        break;
      }
      case "TIMEOUT_10MIN": {
        soundFx.playAttentionChime();
        const updated = currentDoses.map((d) =>
          d.id === targetDose.id
            ? {
                ...d,
                status: "REMINDING_STAGE_2" as const,
                stage: 2 as const,
                secondRemindedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              }
            : d
        );
        storage.saveDoses(updated);
        setActiveDoseId(targetDose.id);
        speakText(
          `Hello ${patient.name.split(" ")[0]}. This is your second reminder. It is time to take your ${targetDose.medicineName}. Please take it now and tell me after you have taken it.`,
          patient.languageCode,
          patient.voiceVolume
        );
        break;
      }
      case "MISSED_ALERT": {
        soundFx.playEmergencyAlarm();
        const updated = currentDoses.map((d) =>
          d.id === targetDose.id
            ? {
                ...d,
                status: "CARE_ALERTED" as const,
              }
            : d
        );
        storage.saveDoses(updated);
        storage.addAlert({
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          type: "MISSED_MEDICINE",
          priority: "URGENT",
          title: "Medicine Reminder Alert: Dose Unconfirmed",
          message: `The patient (${patient.name}) has not confirmed taking their ${targetDose.medicineName} scheduled for ${targetDose.scheduledTime} after 2 reminders.`,
          patientName: patient.name,
          medicineName: targetDose.medicineName,
          transcript: "No patient voice response after 10-minute follow-up reminder.",
          acknowledged: false,
        });
        speakText(
          `I have notified your caregiver ${patient.emergencyContact.name} so they can check on you.`,
          patient.languageCode,
          patient.voiceVolume
        );
        break;
      }
      case "VOICE_UNWELL": {
        soundFx.playEmergencyAlarm();
        storage.addAlert({
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          type: "PATIENT_UNWELL",
          priority: "URGENT",
          title: "⚠️ Patient Health Alert: Weakness Reported",
          message: `Patient stated: "I am feeling weak and having dizziness today."`,
          patientName: patient.name,
          transcript: "I am feeling weak and having dizziness today.",
          symptomSummary: "General weakness and dizziness reported. Family check-in recommended.",
          acknowledged: false,
        });
        storage.addMessage({
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          sender: "PATIENT",
          text: "I am feeling weak and having dizziness today.",
          language: patient.preferredLanguage,
          urgency: "WARNING",
        });
        speakText(
          `Please sit down and rest, ${patient.name.split(" ")[0]}. I have sent an urgent alert to your family so they can call you right away.`,
          patient.languageCode,
          patient.voiceVolume
        );
        break;
      }
    }
  };

  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged).length;

  // If user is not authenticated, show the Login/Registration Portal
  if (!currentUser) {
    return <AuthView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] text-stone-900">
      {/* Top Universal App Header */}
      <Header
        roleMode={roleMode}
        onSelectRole={setRoleMode}
        patient={patient}
        currentUser={currentUser}
        onUpdateLanguage={handleUpdateLanguage}
        onResetData={handleResetData}
        onLogout={handleLogout}
        onSwitchUser={handleSwitchUser}
        alertsCount={unacknowledgedAlerts}
        onOpenGeminiSuite={() => setIsGeminiSuiteOpen(true)}
      />

      {/* Gemini AI Intelligence Suite Modal */}
      <GeminiAssistantPanel
        isOpen={isGeminiSuiteOpen}
        onClose={() => setIsGeminiSuiteOpen(false)}
        patientName={patient.name}
        patientLanguage={patient.preferredLanguage}
      />

      {/* Main Content Area Based on Selected Role Mode */}
      <main className="flex-1 py-4 sm:py-6 px-2 sm:px-4 max-w-7xl mx-auto w-full">
        {roleMode === "PATIENT" && (
          <div className="animate-in fade-in duration-300">
            <PatientView
              patient={patient}
              doses={doses}
              onUpdateDose={handleUpdateDose}
              onPatientAlert={() => {}}
              activeDoseId={activeDoseId}
              onTriggerReminder={handleTriggerReminder}
            />
          </div>
        )}

        {roleMode === "CAREGIVER" && (
          <div className="animate-in fade-in duration-300">
            <CaregiverView
              patient={patient}
              medicines={medicines}
              doses={doses}
              alerts={alerts}
              messages={messages}
              onUpdateMedicines={handleUpdateMedicines}
              onUpdatePatient={handleUpdatePatient}
              onTriggerReminder={handleTriggerReminder}
            />
          </div>
        )}

        {roleMode === "ADMIN" && (
          <div className="animate-in fade-in duration-300">
            <AdminView currentUser={currentUser} />
          </div>
        )}

        {roleMode === "DUAL_SIM" && (
          <div className="animate-in fade-in duration-300">
            <DualDeviceView
              patient={patient}
              medicines={medicines}
              doses={doses}
              alerts={alerts}
              messages={messages}
              onUpdateDose={handleUpdateDose}
              onUpdateMedicines={handleUpdateMedicines}
              onUpdatePatient={handleUpdatePatient}
              onTriggerReminder={handleTriggerReminder}
              activeDoseId={activeDoseId}
              onSimulateScenario={handleSimulateScenario}
            />
          </div>
        )}
      </main>

      {/* Footer info */}
      <footer className="py-4 text-center text-xs font-semibold text-stone-400 border-t border-stone-200 bg-stone-50">
        SevaCare AI • Secure Role-Based Elderly Care & Smart Multilingual Voice Medicine Reminders
      </footer>
    </div>
  );
}
