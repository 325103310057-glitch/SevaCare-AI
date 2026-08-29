import React from "react";
import { PatientView } from "./PatientView";
import { CaregiverView } from "./CaregiverView";
import {
  Medicine,
  PatientProfile,
  ScheduledDose,
  CaregiverAlert,
  VoiceMessage,
} from "../types";
import { Smartphone, Sparkles, Volume2, ShieldCheck, PlayCircle } from "lucide-react";
import { soundFx } from "../utils/audio";

interface DualDeviceViewProps {
  patient: PatientProfile;
  medicines: Medicine[];
  doses: ScheduledDose[];
  alerts: CaregiverAlert[];
  messages: VoiceMessage[];
  onUpdateDose: (updatedDose: ScheduledDose) => void;
  onUpdateMedicines: (meds: Medicine[]) => void;
  onUpdatePatient: (patient: PatientProfile) => void;
  onTriggerReminder: (doseId: string) => void;
  activeDoseId: string | null;
  onSimulateScenario: (scenarioType: string) => void;
}

export const DualDeviceView: React.FC<DualDeviceViewProps> = ({
  patient,
  medicines,
  doses,
  alerts,
  messages,
  onUpdateDose,
  onUpdateMedicines,
  onUpdatePatient,
  onTriggerReminder,
  activeDoseId,
  onSimulateScenario,
}) => {
  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 p-2 sm:p-4">
      {/* Top Interactive Scenario Bar */}
      <div className="bg-gradient-to-r from-stone-900 via-teal-950 to-stone-900 text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-teal-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-black">
            📲
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white">
                Live Dual-Device Simulation
              </h2>
              <span className="bg-teal-500/20 text-teal-300 text-[11px] font-bold px-2 py-0.5 rounded-full border border-teal-500/40">
                Real-time Sync
              </span>
            </div>
            <p className="text-xs text-stone-300">
              Left: Elderly Patient's Phone (Voice-first) • Right: Family Caregiver's Phone (Monitoring)
            </p>
          </div>
        </div>

        {/* 1-Click Interactive Workflow Scenarios */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-scenario-1-reminder"
            type="button"
            onClick={() => onSimulateScenario("TRIGGER_REMINDER")}
            className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-stone-950 font-extrabold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-transform active:scale-95"
          >
            <PlayCircle size={15} />
            <span>1. Trigger 8:00 AM Reminder</span>
          </button>

          <button
            id="btn-scenario-2-taken"
            type="button"
            onClick={() => onSimulateScenario("VOICE_TAKEN")}
            className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-stone-950 font-extrabold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-transform active:scale-95"
          >
            <span>2. Patient: "I took it"</span>
          </button>

          <button
            id="btn-scenario-3-timeout"
            type="button"
            onClick={() => onSimulateScenario("TIMEOUT_10MIN")}
            className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-extrabold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-transform active:scale-95"
          >
            <span>3. 10m Timeout (2nd Voice)</span>
          </button>

          <button
            id="btn-scenario-4-missed-alert"
            type="button"
            onClick={() => onSimulateScenario("MISSED_ALERT")}
            className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-transform active:scale-95"
          >
            <span>4. Alert Caregiver</span>
          </button>

          <button
            id="btn-scenario-5-unwell"
            type="button"
            onClick={() => onSimulateScenario("VOICE_UNWELL")}
            className="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-extrabold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-transform active:scale-95"
          >
            <span>5. "I feel dizzy/weak"</span>
          </button>
        </div>
      </div>

      {/* Side-by-Side Smartphone Mockups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* PHONE 1: ELDERLY PATIENT PHONE */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2 font-bold text-stone-700 text-sm">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span>👵 Patient's Device (Village / Independent Home)</span>
          </div>

          {/* Smartphone Frame Container */}
          <div className="w-full max-w-md bg-stone-900 p-3 sm:p-4 rounded-[40px] shadow-2xl border-4 border-stone-800 ring-8 ring-stone-950/20">
            {/* Phone Speaker & Camera Notch */}
            <div className="w-full flex items-center justify-center mb-2">
              <div className="w-24 h-4 bg-stone-950 rounded-full flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-stone-800" />
                <div className="w-8 h-1.5 rounded-full bg-stone-800" />
              </div>
            </div>

            {/* Inner Phone Screen */}
            <div className="bg-stone-100 rounded-[28px] overflow-hidden max-h-[820px] overflow-y-auto">
              <PatientView
                patient={patient}
                doses={doses}
                onUpdateDose={onUpdateDose}
                onPatientAlert={() => {}}
                activeDoseId={activeDoseId}
                onTriggerReminder={onTriggerReminder}
                isCompactDualMode={true}
              />
            </div>
          </div>
        </div>

        {/* PHONE 2: CAREGIVER / FAMILY PHONE */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2 font-bold text-stone-700 text-sm">
            <span className="w-3 h-3 rounded-full bg-teal-500 animate-pulse" />
            <span>🧑 Caregiver's Device (Son / Daughter in City)</span>
          </div>

          {/* Smartphone Frame Container */}
          <div className="w-full max-w-md bg-stone-900 p-3 sm:p-4 rounded-[40px] shadow-2xl border-4 border-stone-800 ring-8 ring-stone-950/20">
            {/* Phone Speaker & Camera Notch */}
            <div className="w-full flex items-center justify-center mb-2">
              <div className="w-24 h-4 bg-stone-950 rounded-full flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-stone-800" />
                <div className="w-8 h-1.5 rounded-full bg-stone-800" />
              </div>
            </div>

            {/* Inner Phone Screen */}
            <div className="bg-stone-100 rounded-[28px] overflow-hidden max-h-[820px] overflow-y-auto">
              <CaregiverView
                patient={patient}
                medicines={medicines}
                doses={doses}
                alerts={alerts}
                messages={messages}
                onUpdateMedicines={onUpdateMedicines}
                onUpdatePatient={onUpdatePatient}
                onTriggerReminder={onTriggerReminder}
                isCompactDualMode={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
