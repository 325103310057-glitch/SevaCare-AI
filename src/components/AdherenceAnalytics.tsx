import React, { useState, useMemo } from "react";
import {
  Medicine,
  PatientProfile,
  ScheduledDose,
} from "../types";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  Sparkles,
  Download,
  Filter,
  BarChart3,
  PieChart as PieIcon,
  Activity,
  ChevronRight,
  ShieldCheck,
  Zap,
  Info,
} from "lucide-react";
import { soundFx } from "../utils/audio";

interface AdherenceAnalyticsProps {
  patient: PatientProfile;
  medicines: Medicine[];
  currentDoses: ScheduledDose[];
}

export interface DayData {
  date: string;
  displayDate: string;
  dayOfWeek: string;
  adherenceRate: number;
  totalDoses: number;
  takenOnTime: number;
  takenDelayed: number;
  missed: number;
  symptomsReported: number;
  notes: string;
  doses: {
    medName: string;
    time: string;
    status: "TAKEN" | "DELAYED" | "MISSED";
    confirmedAt?: string;
    transcript?: string;
  }[];
}

// Generate realistic 30-day historical data tailored to the patient
function generatePast30DaysHistory(medicines: Medicine[]): DayData[] {
  const data: DayData[] = [];
  const today = new Date();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);

    const dateStr = d.toISOString().split("T")[0];
    const displayDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const dayOfWeek = dayNames[d.getDay()];

    // Baseline adherence: senior has good adherence (approx 92-100%) with occasional missed or delayed doses
    let takenOnTime = 0;
    let takenDelayed = 0;
    let missed = 0;
    let symptoms = 0;
    let note = "All doses taken normally.";

    // Total daily scheduled doses based on active medicines
    const totalDoses = 5; // Amlodipine (1), Metformin (2), Calcium (1), Atorvastatin (1)

    // Realistic variation simulation
    if (i === 18) {
      // Missed 1 evening dose 18 days ago
      takenOnTime = 3;
      takenDelayed = 1;
      missed = 1;
      note = "Delayed dinner; missed bedtime statin.";
    } else if (i === 11) {
      // Reported dizziness 11 days ago
      takenOnTime = 4;
      takenDelayed = 1;
      missed = 0;
      symptoms = 1;
      note = "Reported mild dizziness at 11 AM, rested and took delayed calcium.";
    } else if (i === 4) {
      // Snoozed breakfast dose
      takenOnTime = 3;
      takenDelayed = 2;
      missed = 0;
      note = "Breakfast delayed by 30 mins; doses taken after reminder stage 2.";
    } else if (i === 0) {
      // Today: 1 taken, remainder in progress
      takenOnTime = 1;
      takenDelayed = 0;
      missed = 0;
      note = "Today in progress.";
    } else {
      // High adherence days
      const rand = (i * 17 + 7) % 10;
      if (rand > 7) {
        takenOnTime = 4;
        takenDelayed = 1;
        missed = 0;
      } else {
        takenOnTime = 5;
        takenDelayed = 0;
        missed = 0;
      }
    }

    const calculatedTotal = i === 0 ? 1 : totalDoses;
    const takenCount = takenOnTime + takenDelayed;
    const rate = Math.round((takenCount / calculatedTotal) * 100);

    data.push({
      date: dateStr,
      displayDate,
      dayOfWeek,
      adherenceRate: Math.min(100, rate),
      totalDoses: calculatedTotal,
      takenOnTime,
      takenDelayed,
      missed,
      symptomsReported: symptoms,
      notes: note,
      doses: [
        {
          medName: "Amlodipine 5mg",
          time: "08:00 AM",
          status: "TAKEN",
          confirmedAt: "08:02 AM",
          transcript: "I have taken my morning BP tablet.",
        },
        {
          medName: "Metformin 500mg",
          time: "08:30 AM",
          status: i === 4 ? "DELAYED" : "TAKEN",
          confirmedAt: i === 4 ? "08:55 AM" : "08:32 AM",
          transcript: "Took sugar pill with breakfast.",
        },
        {
          medName: "Calcium + D3",
          time: "01:00 PM",
          status: i === 11 ? "DELAYED" : "TAKEN",
          confirmedAt: i === 11 ? "01:45 PM" : "01:05 PM",
          transcript: "Chewed after lunch.",
        },
        {
          medName: "Metformin 500mg",
          time: "08:30 PM",
          status: "TAKEN",
          confirmedAt: "08:35 PM",
        },
        {
          medName: "Atorvastatin 10mg",
          time: "09:00 PM",
          status: i === 18 ? "MISSED" : "TAKEN",
          confirmedAt: i === 18 ? undefined : "09:04 PM",
        },
      ],
    });
  }

  return data;
}

export const AdherenceAnalytics: React.FC<AdherenceAnalyticsProps> = ({
  patient,
  medicines,
  currentDoses,
}) => {
  const [timeRange, setTimeRange] = useState<"30_DAYS" | "14_DAYS" | "7_DAYS">("30_DAYS");
  const [chartView, setChartView] = useState<"ADHERENCE_AREA" | "STACKED_BARS">("ADHERENCE_AREA");
  const [selectedMedicineFilter, setSelectedMedicineFilter] = useState<string>("ALL");
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  // Generate 30 days dataset
  const fullHistory = useMemo(() => generatePast30DaysHistory(medicines), [medicines]);

  // Filter based on time range
  const filteredHistory = useMemo(() => {
    const sliceCount = timeRange === "7_DAYS" ? 7 : timeRange === "14_DAYS" ? 14 : 30;
    return fullHistory.slice(fullHistory.length - sliceCount);
  }, [fullHistory, timeRange]);

  // Aggregate metrics
  const stats = useMemo(() => {
    let totalScheduled = 0;
    let totalTakenOnTime = 0;
    let totalTakenDelayed = 0;
    let totalMissed = 0;
    let symptomsCount = 0;

    filteredHistory.forEach((day) => {
      totalScheduled += day.totalDoses;
      totalTakenOnTime += day.takenOnTime;
      totalTakenDelayed += day.takenDelayed;
      totalMissed += day.missed;
      symptomsCount += day.symptomsReported;
    });

    const totalTaken = totalTakenOnTime + totalTakenDelayed;
    const overallRate = totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 100;
    const onTimeRate = totalTaken > 0 ? Math.round((totalTakenOnTime / totalTaken) * 100) : 90;

    // Calculate current streak of 100% days
    let streak = 0;
    for (let i = fullHistory.length - 2; i >= 0; i--) {
      if (fullHistory[i].adherenceRate >= 95) {
        streak++;
      } else {
        break;
      }
    }

    return {
      overallRate,
      onTimeRate,
      totalScheduled,
      totalTaken,
      totalTakenOnTime,
      totalTakenDelayed,
      totalMissed,
      symptomsCount,
      streak: Math.max(12, streak),
    };
  }, [filteredHistory, fullHistory]);

  // Medicine Specific Breakdown Data for Bar Chart
  const medicineBreakdownData = useMemo(() => {
    return [
      {
        name: "Amlodipine (BP)",
        fullName: "Amlodipine 5mg",
        timing: "08:00 AM",
        adherence: 98,
        taken: 30,
        delayed: 0,
        missed: 0,
        color: "#f59e0b",
      },
      {
        name: "Metformin (Sugar)",
        fullName: "Metformin 500mg (2x/day)",
        timing: "08:30 AM / 08:30 PM",
        adherence: 94,
        taken: 57,
        delayed: 3,
        missed: 0,
        color: "#3b82f6",
      },
      {
        name: "Calcium + D3",
        fullName: "Calcium + Vit D3",
        timing: "01:00 PM",
        adherence: 96,
        taken: 29,
        delayed: 1,
        missed: 0,
        color: "#10b981",
      },
      {
        name: "Atorvastatin",
        fullName: "Atorvastatin 10mg",
        timing: "09:00 PM",
        adherence: 93,
        taken: 28,
        delayed: 1,
        missed: 1,
        color: "#8b5cf6",
      },
    ];
  }, []);

  // Time of Day distribution
  const timeOfDayData = useMemo(() => {
    return [
      { name: "Morning (8 AM)", value: 45, color: "#f59e0b", label: "Morning 45%" },
      { name: "Afternoon (1 PM)", value: 20, color: "#10b981", label: "Afternoon 20%" },
      { name: "Evening (8:30 PM)", value: 25, color: "#3b82f6", label: "Evening 25%" },
      { name: "Bedtime (9 PM)", value: 10, color: "#8b5cf6", label: "Bedtime 10%" },
    ];
  }, []);

  // Weekly progression
  const weeklyTrends = useMemo(() => {
    return [
      { week: "Week 1", adherence: 91, onTime: 86, missed: 1 },
      { week: "Week 2", adherence: 94, onTime: 90, missed: 1 },
      { week: "Week 3", adherence: 97, onTime: 94, missed: 0 },
      { week: "Week 4 (Current)", adherence: 96, onTime: 92, missed: 0 },
    ];
  }, []);

  // Export clinical report
  const handleExportDoctorReport = () => {
    soundFx.playSuccessChime();
    const reportText = `
======================================================
SEVACARE AI - 30-DAY MEDICINE ADHERENCE REPORT
======================================================
Patient: ${patient.name} (Age: ${patient.age})
Primary Caregiver: ${patient.emergencyContact.name}
Attending Physician: ${patient.doctorContact.name} (${patient.doctorContact.specialty})
Date Generated: ${new Date().toLocaleDateString("en-US", { dateStyle: "full" })}
------------------------------------------------------
OVERALL 30-DAY METRICS:
• Overall Adherence Rate: ${stats.overallRate}% (Target: ≥90%)
• On-Time Intake Rate: ${stats.onTimeRate}%
• Total Doses Taken: ${stats.totalTaken} / ${stats.totalScheduled}
• Missed Doses: ${stats.totalMissed}
• Unwell Symptoms Reported via Voice: ${stats.symptomsCount}
• Longest Perfect Compliance Streak: ${stats.streak} Days

MEDICINE BREAKDOWN:
1. Amlodipine 5mg (BP): 98% Adherence • 30/30 doses taken
2. Metformin 500mg (Diabetes): 94% Adherence • 57/60 doses taken
3. Calcium + D3 (Bone Strength): 96% Adherence • 29/30 doses taken
4. Atorvastatin 10mg (Lipids): 93% Adherence • 28/30 doses taken

CLINICAL OBSERVATION:
Patient shows excellent voice-prompt response for morning blood pressure medications.
Evening adherence is solid with minor delay around meal times.
======================================================
    `.trim();

    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Adherence-Report-${patient.name.replace(/\s+/g, "_")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-stone-200 shadow-sm flex flex-col gap-6">
      {/* Header with Title & Date Range Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 border border-teal-300 text-teal-800 flex items-center justify-center">
              <TrendingUp size={22} className="text-teal-800" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-stone-900 tracking-tight">
                  Medication Adherence & Trend Analytics
                </h3>
                <span className="bg-teal-100 text-teal-900 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-teal-200">
                  Past Month
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                AI voice-verified logs and clinical adherence tracking for {patient.name}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: Time Filter + Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Selector */}
          <div className="bg-stone-100 p-1 rounded-xl flex items-center border border-stone-200 text-xs font-bold">
            {(
              [
                { id: "7_DAYS", label: "7 Days" },
                { id: "14_DAYS", label: "14 Days" },
                { id: "30_DAYS", label: "30 Days" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTimeRange(item.id);
                  soundFx.playMicClick();
                }}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  timeRange === item.id
                    ? "bg-white text-teal-900 shadow-xs font-black"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Export Report */}
          <button
            id="btn-export-adherence-report"
            type="button"
            onClick={handleExportDoctorReport}
            className="bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            title="Download formatted clinical report for doctor visit"
          >
            <Download size={14} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Highlights Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Overall Adherence */}
        <div className="bg-gradient-to-br from-teal-50 to-emerald-50/50 p-4 rounded-2xl border-2 border-teal-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">
              Overall Adherence
            </span>
            <ShieldCheck size={18} className="text-teal-700" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-black text-teal-950 font-mono flex items-baseline gap-1">
              {stats.overallRate}%
              <span className="text-xs font-bold text-emerald-700">▲ +4% vs target</span>
            </div>
          </div>
          <div className="text-[11px] text-teal-800 font-medium">
            Target benchmark: ≥90% (Doctor Approved)
          </div>
        </div>

        {/* Metric 2: On-Time Confirmation */}
        <div className="bg-white p-4 rounded-2xl border-2 border-stone-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              On-Time Response
            </span>
            <Clock size={18} className="text-amber-600" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-black text-stone-900 font-mono">
              {stats.onTimeRate}%
            </div>
          </div>
          <div className="text-[11px] text-stone-500 font-medium">
            Taken on 1st voice reminder stage
          </div>
        </div>

        {/* Metric 3: Best Streak */}
        <div className="bg-white p-4 rounded-2xl border-2 border-stone-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Best Streak
            </span>
            <Award size={18} className="text-amber-500" />
          </div>
          <div className="my-2">
            <div className="text-3xl font-black text-amber-700 font-mono flex items-baseline gap-1">
              {stats.streak} <span className="text-sm font-bold text-stone-600">Days</span>
            </div>
          </div>
          <div className="text-[11px] text-stone-500 font-medium">
            Consecutive 100% adherence
          </div>
        </div>

        {/* Metric 4: Missed Doses */}
        <div className="bg-white p-4 rounded-2xl border-2 border-stone-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Missed Doses
            </span>
            <AlertCircle size={18} className={stats.totalMissed > 0 ? "text-rose-600" : "text-emerald-600"} />
          </div>
          <div className="my-2">
            <div className={`text-3xl font-black font-mono ${stats.totalMissed > 0 ? "text-rose-700" : "text-emerald-700"}`}>
              {stats.totalMissed}
            </div>
          </div>
          <div className="text-[11px] text-stone-500 font-medium">
            {stats.totalMissed === 0 ? "Zero missed doses recorded" : "Resolved via caregiver alert"}
          </div>
        </div>
      </div>

      {/* Main Chart 1: 30-Day Adherence Trend Area Chart */}
      <div className="bg-stone-50/70 rounded-2xl p-4 sm:p-5 border border-stone-200 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
              <Activity size={18} className="text-teal-700" />
              <span>Daily Adherence Trend (%) & Safety Benchmark</span>
            </h4>
            <p className="text-xs text-stone-500 font-medium">
              Line shows daily compliance; dashed red line indicates clinical minimum (90%)
            </p>
          </div>

          {/* Toggle between Area Chart and Bar Chart */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setChartView("ADHERENCE_AREA")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                chartView === "ADHERENCE_AREA"
                  ? "bg-teal-700 text-white"
                  : "bg-white text-stone-600 border border-stone-200"
              }`}
            >
              <TrendingUp size={13} />
              <span>Adherence %</span>
            </button>

            <button
              type="button"
              onClick={() => setChartView("STACKED_BARS")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                chartView === "STACKED_BARS"
                  ? "bg-teal-700 text-white"
                  : "bg-white text-stone-600 border border-stone-200"
              }`}
            >
              <BarChart3 size={13} />
              <span>Dose Counts</span>
            </button>
          </div>
        </div>

        {/* Recharts Render Area */}
        <div className="w-full h-72 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartView === "ADHERENCE_AREA" ? (
              <AreaChart
                data={filteredHistory}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    setSelectedDay(e.activePayload[0].payload as DayData);
                  }
                }}
              >
                <defs>
                  <linearGradient id="adherenceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                />
                <YAxis
                  domain={[60, 100]}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickFormatter={(v) => `${v}%`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload as DayData;
                      return (
                        <div className="bg-white p-3 rounded-xl border-2 border-teal-600 shadow-lg text-xs">
                          <div className="font-extrabold text-stone-900 flex items-center justify-between gap-4 border-b border-stone-100 pb-1.5 mb-1.5">
                            <span>{d.date} ({d.dayOfWeek})</span>
                            <span className="text-teal-700 font-mono font-black">{d.adherenceRate}%</span>
                          </div>
                          <div className="text-stone-600 space-y-0.5">
                            <div>• Taken on time: <strong className="text-emerald-700">{d.takenOnTime}</strong></div>
                            <div>• Delayed/Snoozed: <strong className="text-amber-700">{d.takenDelayed}</strong></div>
                            <div>• Missed: <strong className="text-rose-700">{d.missed}</strong></div>
                            {d.symptomsReported > 0 && (
                              <div className="text-orange-700 font-bold">• ⚠️ Symptom reported</div>
                            )}
                          </div>
                          <div className="mt-1.5 pt-1 border-t border-stone-100 text-[10px] text-stone-400">
                            Click point to inspect day's doses
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={90}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{
                    value: "90% Clinical Target",
                    position: "insideBottomRight",
                    fill: "#ef4444",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="adherenceRate"
                  stroke="#0d9488"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#adherenceGradient)"
                  activeDot={{ r: 6, fill: "#0f766e", stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            ) : (
              <BarChart
                data={filteredHistory}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    setSelectedDay(e.activePayload[0].payload as DayData);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload as DayData;
                      return (
                        <div className="bg-white p-3 rounded-xl border border-stone-300 shadow-md text-xs">
                          <div className="font-bold text-stone-900 border-b pb-1 mb-1">{d.date}</div>
                          <div>Taken On Time: <strong className="text-emerald-700">{d.takenOnTime}</strong></div>
                          <div>Delayed: <strong className="text-amber-700">{d.takenDelayed}</strong></div>
                          <div>Missed: <strong className="text-rose-700">{d.missed}</strong></div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <Bar dataKey="takenOnTime" name="Taken On Time" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="takenDelayed" name="Delayed / Snoozed" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                <Bar dataKey="missed" name="Missed" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Breakdown by Medicine & Time of Day */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 2: Adherence by Prescribed Medicine */}
        <div className="bg-stone-50/70 rounded-2xl p-4 sm:p-5 border border-stone-200 flex flex-col gap-3">
          <div>
            <h4 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
              <BarChart3 size={18} className="text-teal-700" />
              <span>Adherence by Specific Medicine</span>
            </h4>
            <p className="text-xs text-stone-500 font-medium">
              Comparing past 30 days compliance per prescription
            </p>
          </div>

          <div className="w-full h-56 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={medicineBreakdownData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis
                  type="number"
                  domain={[80, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#374151", fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                />
                <Tooltip
                  formatter={(val: any, _name: any, item: any) => [
                    `${val}% (${item.payload.taken} doses taken)`,
                    item.payload.fullName,
                  ]}
                  contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                />
                <Bar dataKey="adherence" name="Adherence Rate" radius={[0, 8, 8, 0]}>
                  {medicineBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-stone-200">
            {medicineBreakdownData.map((m) => (
              <div key={m.name} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-stone-200">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                <div className="truncate">
                  <div className="font-bold text-stone-800 truncate">{m.name}</div>
                  <div className="text-[11px] text-stone-500 font-mono font-semibold">{m.adherence}% • {m.timing}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 3: Time of Day Distribution & Weekly Progression */}
        <div className="bg-stone-50/70 rounded-2xl p-4 sm:p-5 border border-stone-200 flex flex-col gap-3">
          <div>
            <h4 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
              <PieIcon size={18} className="text-teal-700" />
              <span>Intake Schedule Distribution & Weekly Trend</span>
            </h4>
            <p className="text-xs text-stone-500 font-medium">
              Doses by time slot & week-over-week consistency
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            {/* Donut Chart */}
            <div className="w-full h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={timeOfDayData}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={58}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {timeOfDayData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => [`${v}% of daily doses`, "Time Slot"]}
                    contentStyle={{ borderRadius: "10px", fontSize: "11px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend / Key */}
            <div className="flex flex-col gap-1.5 text-xs">
              {timeOfDayData.map((slot) => (
                <div key={slot.name} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-stone-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: slot.color }} />
                    <span className="font-semibold text-stone-700 text-[11px]">{slot.name}</span>
                  </div>
                  <span className="font-mono font-bold text-stone-900 text-[11px]">{slot.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Bar Chart Mini */}
          <div className="pt-2 border-t border-stone-200">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
              4-Week Adherence Progress
            </span>
            <div className="grid grid-cols-4 gap-2">
              {weeklyTrends.map((w, idx) => (
                <div
                  key={w.week}
                  className={`p-2 rounded-xl text-center border ${
                    idx === 3 ? "bg-teal-50 border-teal-300" : "bg-white border-stone-200"
                  }`}
                >
                  <div className="text-[10px] text-stone-500 font-bold">{w.week.split(" ")[0]} {w.week.split(" ")[1]}</div>
                  <div className="text-sm font-black text-teal-900 font-mono mt-0.5">{w.adherence}%</div>
                  <div className="text-[9px] font-medium text-emerald-700">{w.onTime}% on-time</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 30-Day Interactive Adherence Calendar Grid */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-stone-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h4 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
              <Calendar size={18} className="text-teal-700" />
              <span>30-Day Adherence Calendar View</span>
            </h4>
            <p className="text-xs text-stone-500 font-medium">
              Click any day to view detailed medicine confirmations and voice transcripts
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-[11px] font-semibold text-stone-600">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 100% Taken
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Delayed
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Missed
            </span>
          </div>
        </div>

        {/* 30-Day Grid */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
          {fullHistory.map((day) => {
            const isPerfect = day.adherenceRate === 100;
            const hasMissed = day.missed > 0;
            const hasDelay = day.takenDelayed > 0 && !hasMissed;
            const isSelected = selectedDay?.date === day.date;

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => {
                  setSelectedDay(day);
                  soundFx.playMicClick();
                }}
                className={`p-2 rounded-xl flex flex-col items-center justify-between border-2 transition-all cursor-pointer text-center ${
                  isSelected
                    ? "border-teal-700 bg-teal-50 ring-2 ring-teal-400"
                    : isPerfect
                    ? "bg-emerald-50/80 border-emerald-200 hover:border-emerald-400"
                    : hasMissed
                    ? "bg-rose-50 border-rose-300 hover:border-rose-400"
                    : "bg-amber-50/80 border-amber-200 hover:border-amber-400"
                }`}
              >
                <span className="text-[10px] font-bold text-stone-500">{day.dayOfWeek}</span>
                <span className="text-xs font-black text-stone-900 my-0.5">{day.displayDate.split(" ")[1]}</span>
                <span
                  className={`text-[9px] font-black px-1 rounded-sm ${
                    isPerfect
                      ? "text-emerald-800 bg-emerald-100"
                      : hasMissed
                      ? "text-rose-800 bg-rose-100"
                      : "text-amber-800 bg-amber-100"
                  }`}
                >
                  {day.adherenceRate}%
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Day Detail Drawer */}
        {selectedDay && (
          <div className="mt-4 p-4 bg-stone-50 rounded-2xl border-2 border-teal-500 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-stone-900 text-sm">
                  📅 Log Details for {selectedDay.date} ({selectedDay.dayOfWeek})
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    selectedDay.adherenceRate === 100
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {selectedDay.adherenceRate}% Adherence
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="text-xs font-bold text-stone-500 hover:text-stone-800 underline cursor-pointer"
              >
                Close Day Details
              </button>
            </div>

            <div className="text-xs font-medium text-stone-600 mt-2">
              <strong>Caregiver Daily Note:</strong> {selectedDay.notes}
            </div>

            {/* List of Doses on that day */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              {selectedDay.doses.map((d, dIdx) => (
                <div
                  key={dIdx}
                  className="bg-white p-2.5 rounded-xl border border-stone-200 text-xs flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="font-bold text-stone-900">{d.medName}</div>
                    <div className="text-[11px] text-stone-500">{d.time}</div>
                    {d.transcript && (
                      <div className="text-[10px] text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded mt-1 font-medium">
                        🗣️ "{d.transcript}"
                      </div>
                    )}
                  </div>

                  <div>
                    {d.status === "TAKEN" && (
                      <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-lg text-[10px]">
                        ✓ {d.confirmedAt || "Taken"}
                      </span>
                    )}
                    {d.status === "DELAYED" && (
                      <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-lg text-[10px]">
                        ⏳ {d.confirmedAt || "Delayed"}
                      </span>
                    )}
                    {d.status === "MISSED" && (
                      <span className="bg-rose-100 text-rose-900 font-bold px-2 py-0.5 rounded-lg text-[10px]">
                        ✗ Missed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Clinical Insights Banner */}
      <div className="bg-gradient-to-r from-teal-900 to-emerald-950 text-white rounded-2xl p-5 border border-teal-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-teal-700/60 border border-teal-500/40 flex items-center justify-center text-teal-200 shrink-0">
            <Sparkles size={20} className="text-teal-200" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <span>Gemini Clinical Adherence Insight</span>
              <span className="bg-emerald-400 text-emerald-950 text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
                AI Summary
              </span>
            </h4>
            <p className="text-xs text-teal-100/90 font-medium mt-1 leading-relaxed">
              {patient.name} has maintained a <strong>{stats.overallRate}% overall adherence rate</strong> over the past 30 days. Morning blood pressure pills have a <strong>98% on-time record</strong>. The 10-minute automated follow-up reminder has successfully recovered 3 delayed evening doses without requiring emergency escalation.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportDoctorReport}
          className="bg-white hover:bg-teal-50 text-teal-950 px-4 py-2 rounded-xl text-xs font-black shrink-0 flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
        >
          <Download size={14} />
          <span>Doctor PDF/Text Export</span>
        </button>
      </div>
    </div>
  );
};
