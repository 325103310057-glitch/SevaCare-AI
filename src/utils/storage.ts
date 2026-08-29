import {
  Medicine,
  PatientProfile,
  ScheduledDose,
  CaregiverAlert,
  VoiceMessage,
  UserAccount,
  UserRole,
  PatientCaregiverRelationship,
  ConnectionRequest,
  SystemAuditLog,
  SUPPORTED_LANGUAGES,
} from "../types";

const STORAGE_KEYS = {
  MEDICINES: "elderly_care_medicines_v1",
  DOSES: "elderly_care_doses_v1",
  PATIENT: "elderly_care_patient_v1",
  PATIENTS_LIST: "elderly_care_patients_list_v1",
  ALERTS: "elderly_care_alerts_v1",
  MESSAGES: "elderly_care_messages_v1",
  USERS: "elderly_care_users_v1",
  CURRENT_USER: "elderly_care_current_user_v1",
  RELATIONSHIPS: "elderly_care_relationships_v1",
  CONNECTION_REQUESTS: "elderly_care_connection_requests_v1",
  AUDIT_LOGS: "elderly_care_audit_logs_v1",
  JWT_TOKEN: "sevacare_jwt_token_v1",
};

// Initial verified connection requests
export const DEFAULT_CONNECTION_REQUESTS: ConnectionRequest[] = [
  {
    id: "conn-1",
    patientId: "user-patient-1",
    patientName: "Kalyani Amma",
    patientPhone: "+91 98451 22345",
    caretakerId: "user-caregiver-1",
    caretakerName: "Rahul Sharma",
    caretakerPhone: "+91 98765 43210",
    relation: "Son & Primary Caregiver",
    status: "APPROVED",
    requestedBy: "CAREGIVER",
    createdAt: "2026-01-15T08:35:00.000Z",
    respondedAt: "2026-01-15T08:40:00.000Z",
  },
];

// Initial system accounts
export const DEFAULT_USERS: UserAccount[] = [
  {
    id: "user-patient-1",
    name: "Kalyani Amma",
    email: "patient@elderlycare.ai",
    role: "PATIENT",
    phone: "+91 98451 22345",
    preferredLanguage: "Telugu",
    languageCode: "te-IN",
    patientProfileId: "patient-1",
    avatarUrl: "👵",
    status: "ACTIVE",
    createdAt: "2026-01-15T08:00:00.000Z",
    lastLoginAt: new Date().toISOString(),
  },
  {
    id: "user-caregiver-1",
    name: "Rahul Sharma",
    email: "caregiver@elderlycare.ai",
    role: "CAREGIVER",
    phone: "+91 98765 43210",
    preferredLanguage: "English",
    languageCode: "en-US",
    caregiverRelation: "Son & Primary Caregiver",
    assignedPatientIds: ["patient-1", "patient-2"],
    avatarUrl: "👨‍💼",
    status: "ACTIVE",
    createdAt: "2026-01-15T08:30:00.000Z",
    lastLoginAt: new Date().toISOString(),
  },
  {
    id: "user-admin-1",
    name: "Dr. Vikram Mehra",
    email: "admin@elderlycare.ai",
    role: "ADMIN",
    phone: "+91 91234 56789",
    preferredLanguage: "English",
    languageCode: "en-US",
    avatarUrl: "🛡️",
    status: "ACTIVE",
    createdAt: "2025-11-01T10:00:00.000Z",
    lastLoginAt: new Date().toISOString(),
  },
];

// Initial relationships
export const DEFAULT_RELATIONSHIPS: PatientCaregiverRelationship[] = [
  {
    id: "rel-1",
    patientId: "patient-1",
    patientName: "Kalyani Amma (Mother)",
    caregiverId: "user-caregiver-1",
    caregiverName: "Rahul Sharma",
    caregiverEmail: "caregiver@elderlycare.ai",
    relation: "Son & Primary Caregiver",
    permissions: ["VIEW_SCHEDULE", "EDIT_MEDICINES", "RECEIVE_EMERGENCY_ALERTS", "VOICE_MESSAGES"],
    status: "ACTIVE",
    assignedAt: "2026-01-15",
  },
  {
    id: "rel-2",
    patientId: "patient-2",
    patientName: "Ramachandra Rao (Uncle)",
    caregiverId: "user-caregiver-1",
    caregiverName: "Rahul Sharma",
    caregiverEmail: "caregiver@elderlycare.ai",
    relation: "Nephew & Care Coordinator",
    permissions: ["VIEW_SCHEDULE", "EDIT_MEDICINES", "RECEIVE_EMERGENCY_ALERTS"],
    status: "ACTIVE",
    assignedAt: "2026-02-10",
  },
  {
    id: "rel-3",
    patientId: "patient-1",
    patientName: "Kalyani Amma (Mother)",
    caregiverId: "user-caregiver-2",
    caregiverName: "Anita Desai (Visiting Nurse)",
    caregiverEmail: "nurse.anita@elderlycare.ai",
    relation: "Registered Home Nurse",
    permissions: ["VIEW_SCHEDULE", "VOICE_MESSAGES"],
    status: "ACTIVE",
    assignedAt: "2026-02-01",
  },
];

// Initial audit logs
export const DEFAULT_AUDIT_LOGS: SystemAuditLog[] = [
  {
    id: "log-1",
    timestamp: "Today at 08:32 AM",
    actorName: "Kalyani Amma",
    actorRole: "PATIENT",
    action: "VOICE_DOSE_CONFIRMED",
    target: "Metformin 500mg",
    details: "Voice intent: MEDICINE_TAKEN ('వేసుకున్నాను - I have taken'). Confidence 0.98.",
    severity: "INFO",
  },
  {
    id: "log-2",
    timestamp: "Today at 08:00 AM",
    actorName: "System Voice Daemon",
    actorRole: "ADMIN",
    action: "REMINDER_DISPATCHED",
    target: "patient-1",
    details: "Stage 1 AI voice reminder broadcasted in Telugu (te-IN) for Amlodipine 5mg.",
    severity: "INFO",
  },
  {
    id: "log-3",
    timestamp: "Yesterday at 09:15 PM",
    actorName: "Rahul Sharma",
    actorRole: "CAREGIVER",
    action: "MEDICINE_SCHEDULE_UPDATED",
    target: "Atorvastatin 10mg",
    details: "Adjusted evening reminder time from 21:30 to 21:00 with food advisory.",
    severity: "INFO",
  },
  {
    id: "log-4",
    timestamp: "3 days ago",
    actorName: "Dr. Vikram Mehra",
    actorRole: "ADMIN",
    action: "RELATIONSHIP_CREATED",
    target: "rel-2 (Rahul Sharma ↔ Ramachandra Rao)",
    details: "Approved multi-patient caregiver access with full clinical permissions.",
    severity: "SECURITY",
  },
];

// Initial realistic seed medicines
const DEFAULT_MEDICINES: Medicine[] = [
  {
    id: "med-1",
    name: "Amlodipine (Blood Pressure)",
    dosage: "5 mg • 1 tablet",
    purpose: "Controls blood pressure & relaxes blood vessels",
    scheduleType: "DAILY",
    times: ["08:00"],
    mealTiming: "AFTER_MEAL",
    instructions: "Take with half glass of warm water after breakfast",
    pillColor: "#f59e0b", // Amber/Gold tablet
    iconType: "tablet",
    remainingPills: 24,
    totalPills: 30,
    active: true,
    prescribedBy: "Dr. Arvind Mehta (Cardiologist)",
  },
  {
    id: "med-2",
    name: "Metformin (Diabetes Control)",
    dosage: "500 mg • 1 tablet",
    purpose: "Maintains healthy blood sugar levels",
    scheduleType: "TWICE_DAILY",
    times: ["08:30", "20:30"],
    mealTiming: "WITH_MEAL",
    instructions: "Take right in the middle of your meal",
    pillColor: "#3b82f6", // Blue capsule
    iconType: "capsule",
    remainingPills: 45,
    totalPills: 60,
    active: true,
    prescribedBy: "Dr. Arvind Mehta",
  },
  {
    id: "med-3",
    name: "Calcium + Vitamin D3",
    dosage: "500 IU • 1 chewable",
    purpose: "Bone strength & joint vitality",
    scheduleType: "DAILY",
    times: ["13:00"],
    mealTiming: "AFTER_MEAL",
    instructions: "Chew thoroughly after lunch",
    pillColor: "#10b981", // Emerald round
    iconType: "tablet",
    remainingPills: 18,
    totalPills: 30,
    active: true,
    prescribedBy: "Dr. Sunita Rao (Orthopedic)",
  },
  {
    id: "med-4",
    name: "Atorvastatin (Cholesterol)",
    dosage: "10 mg • 1 tablet",
    purpose: "Heart protection & lipid balance",
    scheduleType: "DAILY",
    times: ["21:00"],
    mealTiming: "BEFORE_MEAL",
    instructions: "Take 30 minutes before bedtime with water",
    pillColor: "#8b5cf6", // Purple tablet
    iconType: "tablet",
    remainingPills: 20,
    totalPills: 30,
    active: true,
    prescribedBy: "Dr. Arvind Mehta",
  },
];

const DEFAULT_PATIENT: PatientProfile = {
  id: "patient-1",
  name: "Kalyani Amma (Grandmother)",
  relation: "Mother / Grandmother",
  age: 74,
  preferredLanguage: "Telugu",
  languageCode: "te-IN",
  phone: "+91 98451 22345",
  location: "Green Village, Karnataka (Independent Home)",
  emergencyContact: {
    name: "Rahul Sharma (Son)",
    phone: "+91 98765 43210",
    relation: "Son (Living in Bengaluru, 150 km away)",
  },
  doctorContact: {
    name: "Dr. Arvind Mehta",
    specialty: "Senior Geriatrician & Cardiologist",
    phone: "+91 98111 22334",
  },
  voiceVolume: 0.95,
  voiceSpeed: 0.9,
};

const DEFAULT_PATIENTS_LIST: PatientProfile[] = [
  DEFAULT_PATIENT,
  {
    id: "patient-2",
    name: "Ramachandra Rao (Uncle)",
    relation: "Uncle",
    age: 78,
    preferredLanguage: "Hindi",
    languageCode: "hi-IN",
    phone: "+91 98452 77889",
    location: "Mysuru, Karnataka",
    emergencyContact: {
      name: "Rahul Sharma (Nephew)",
      phone: "+91 98765 43210",
      relation: "Nephew",
    },
    doctorContact: {
      name: "Dr. Sunita Rao",
      specialty: "General Physician",
      phone: "+91 98222 33445",
    },
    voiceVolume: 0.9,
    voiceSpeed: 0.9,
  },
];

const DEFAULT_DOSES: ScheduledDose[] = [
  {
    id: "dose-1",
    medicineId: "med-1",
    medicineName: "Amlodipine (Blood Pressure)",
    dosage: "5 mg • 1 tablet",
    scheduledTime: "08:00 AM",
    scheduledTime24: "08:00",
    instructions: "Take with warm water after breakfast",
    mealTiming: "AFTER_MEAL",
    iconType: "tablet",
    pillColor: "#f59e0b",
    status: "CONFIRMED_TAKEN",
    stage: 1,
    firstRemindedAt: "08:00 AM",
    confirmedAt: "08:02 AM",
    patientResponse: "I have taken my blood pressure medicine with tea.",
  },
  {
    id: "dose-2",
    medicineId: "med-2",
    medicineName: "Metformin (Diabetes Control)",
    dosage: "500 mg • 1 tablet",
    scheduledTime: "08:30 AM",
    scheduledTime24: "08:30",
    instructions: "Take with morning breakfast",
    mealTiming: "WITH_MEAL",
    iconType: "capsule",
    pillColor: "#3b82f6",
    status: "PENDING",
    stage: 1,
  },
  {
    id: "dose-3",
    medicineId: "med-3",
    medicineName: "Calcium + Vitamin D3",
    dosage: "500 IU • 1 chewable",
    scheduledTime: "01:00 PM",
    scheduledTime24: "13:00",
    instructions: "Chew thoroughly after lunch",
    mealTiming: "AFTER_MEAL",
    iconType: "tablet",
    pillColor: "#10b981",
    status: "PENDING",
    stage: 1,
  },
  {
    id: "dose-4",
    medicineId: "med-2",
    medicineName: "Metformin (Diabetes Control)",
    dosage: "500 mg • 1 tablet",
    scheduledTime: "08:30 PM",
    scheduledTime24: "20:30",
    instructions: "Take with dinner",
    mealTiming: "WITH_MEAL",
    iconType: "capsule",
    pillColor: "#3b82f6",
    status: "PENDING",
    stage: 1,
  },
  {
    id: "dose-5",
    medicineId: "med-4",
    medicineName: "Atorvastatin (Cholesterol)",
    dosage: "10 mg • 1 tablet",
    scheduledTime: "09:00 PM",
    scheduledTime24: "21:00",
    instructions: "Take 30 mins before sleep",
    mealTiming: "BEFORE_MEAL",
    iconType: "tablet",
    pillColor: "#8b5cf6",
    status: "PENDING",
    stage: 1,
  },
];

const DEFAULT_ALERTS: CaregiverAlert[] = [
  {
    id: "alert-1",
    timestamp: "Yesterday, 08:45 AM",
    type: "CONFIRMED",
    priority: "INFO",
    title: "Morning Dose Confirmed",
    message: "Kalyani Amma took Amlodipine & Metformin promptly.",
    patientName: "Kalyani Amma",
    medicineName: "Amlodipine 5mg",
    transcript: "I have taken the yellow tablet and had idli.",
    acknowledged: true,
    createdAt: Date.now() - 86400000,
  },
];

const DEFAULT_MESSAGES: VoiceMessage[] = [
  {
    id: "msg-1",
    timestamp: "Yesterday, 06:15 PM",
    sender: "PATIENT",
    text: "Rahul beta, the weather is very pleasant in the village today. I had my evening tea.",
    language: "English",
    urgency: "NORMAL",
    createdAt: Date.now() - 72000000,
  },
  {
    id: "msg-2",
    timestamp: "Yesterday, 06:30 PM",
    sender: "CAREGIVER",
    text: "Wonderful, Amma! Please remember to take your evening pills with dinner at 8:30 PM.",
    language: "English",
    urgency: "NORMAL",
    createdAt: Date.now() - 71000000,
  },
];

class StorageService {
  private listeners: Set<() => void> = new Set();

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  getMedicines(): Medicine[] {
    if (typeof window === "undefined") return DEFAULT_MEDICINES;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MEDICINES);
      return stored ? JSON.parse(stored) : DEFAULT_MEDICINES;
    } catch {
      return DEFAULT_MEDICINES;
    }
  }

  saveMedicines(medicines: Medicine[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.MEDICINES, JSON.stringify(medicines));
    this.notify();
  }

  getDoses(): ScheduledDose[] {
    if (typeof window === "undefined") return DEFAULT_DOSES;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DOSES);
      return stored ? JSON.parse(stored) : DEFAULT_DOSES;
    } catch {
      return DEFAULT_DOSES;
    }
  }

  saveDoses(doses: ScheduledDose[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.DOSES, JSON.stringify(doses));
    this.notify();
  }

  getPatient(): PatientProfile {
    if (typeof window === "undefined") return DEFAULT_PATIENT;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PATIENT);
      return stored ? JSON.parse(stored) : DEFAULT_PATIENT;
    } catch {
      return DEFAULT_PATIENT;
    }
  }

  savePatient(patient: PatientProfile) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.PATIENT, JSON.stringify(patient));
    this.notify();
  }

  getAlerts(): CaregiverAlert[] {
    if (typeof window === "undefined") return DEFAULT_ALERTS;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ALERTS);
      return stored ? JSON.parse(stored) : DEFAULT_ALERTS;
    } catch {
      return DEFAULT_ALERTS;
    }
  }

  saveAlerts(alerts: CaregiverAlert[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts));
    this.notify();
  }

  addAlert(alert: Omit<CaregiverAlert, "id" | "createdAt">) {
    const alerts = this.getAlerts();
    const newAlert: CaregiverAlert = {
      ...alert,
      id: `alert-${Date.now()}`,
      createdAt: Date.now(),
    };
    this.saveAlerts([newAlert, ...alerts]);
    return newAlert;
  }

  getMessages(): VoiceMessage[] {
    if (typeof window === "undefined") return DEFAULT_MESSAGES;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      return stored ? JSON.parse(stored) : DEFAULT_MESSAGES;
    } catch {
      return DEFAULT_MESSAGES;
    }
  }

  saveMessages(messages: VoiceMessage[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    this.notify();
  }

  addMessage(msg: Omit<VoiceMessage, "id" | "createdAt">) {
    const messages = this.getMessages();
    const newMsg: VoiceMessage = {
      ...msg,
      id: `msg-${Date.now()}`,
      createdAt: Date.now(),
    };
    this.saveMessages([...messages, newMsg]);
    return newMsg;
  }

  // Users management
  getUsers(): UserAccount[] {
    if (typeof window === "undefined") return DEFAULT_USERS;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USERS);
      return stored ? JSON.parse(stored) : DEFAULT_USERS;
    } catch {
      return DEFAULT_USERS;
    }
  }

  saveUsers(users: UserAccount[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.notify();
  }

  getUserByPhone(phone: string): UserAccount | undefined {
    const cleanInput = phone.replace(/[^0-9]/g, "");
    if (!cleanInput) return undefined;
    const users = this.getUsers();
    return users.find((u) => {
      if (!u.phone) return false;
      const cleanUserPhone = u.phone.replace(/[^0-9]/g, "");
      return (
        cleanUserPhone === cleanInput ||
        cleanUserPhone.endsWith(cleanInput) ||
        cleanInput.endsWith(cleanUserPhone)
      );
    });
  }

  getCurrentUser(): UserAccount | null {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  setCurrentUser(user: UserAccount | null) {
    if (typeof window === "undefined") return;
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(STORAGE_KEYS.JWT_TOKEN);
    }
    this.notify();
  }

  // JWT Token Management
  getJwtToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEYS.JWT_TOKEN);
  }

  setJwtToken(token: string | null) {
    if (typeof window === "undefined") return;
    if (token) {
      localStorage.setItem(STORAGE_KEYS.JWT_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.JWT_TOKEN);
    }
    this.notify();
  }

  getAuthHeaders(): HeadersInit {
    const token = this.getJwtToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // Patients list for multi-patient support
  getPatientsList(): PatientProfile[] {
    if (typeof window === "undefined") return DEFAULT_PATIENTS_LIST;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PATIENTS_LIST);
      return stored ? JSON.parse(stored) : DEFAULT_PATIENTS_LIST;
    } catch {
      return DEFAULT_PATIENTS_LIST;
    }
  }

  savePatientsList(list: PatientProfile[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.PATIENTS_LIST, JSON.stringify(list));
    this.notify();
  }

  // Relationships management
  getRelationships(): PatientCaregiverRelationship[] {
    if (typeof window === "undefined") return DEFAULT_RELATIONSHIPS;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RELATIONSHIPS);
      return stored ? JSON.parse(stored) : DEFAULT_RELATIONSHIPS;
    } catch {
      return DEFAULT_RELATIONSHIPS;
    }
  }

  saveRelationships(rels: PatientCaregiverRelationship[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.RELATIONSHIPS, JSON.stringify(rels));
    this.notify();
  }

  addRelationship(rel: Omit<PatientCaregiverRelationship, "id" | "assignedAt">) {
    const rels = this.getRelationships();
    const newRel: PatientCaregiverRelationship = {
      ...rel,
      id: `rel-${Date.now()}`,
      assignedAt: new Date().toISOString().split("T")[0],
    };
    this.saveRelationships([newRel, ...rels]);
    this.addAuditLog({
      actorName: "System Administrator",
      actorRole: "ADMIN",
      action: "CARE_RELATIONSHIP_CREATED",
      target: `${newRel.caregiverName} ↔ ${newRel.patientName}`,
      details: `Granted permissions: ${newRel.permissions.join(", ")}`,
      severity: "SECURITY",
    });
    return newRel;
  }

  deleteRelationship(id: string) {
    const rels = this.getRelationships().filter((r) => r.id !== id);
    this.saveRelationships(rels);
    this.addAuditLog({
      actorName: "System Administrator",
      actorRole: "ADMIN",
      action: "CARE_RELATIONSHIP_REVOKED",
      target: id,
      details: `Revoked care assignment permissions`,
      severity: "WARNING",
    });
  }

  // Connection Requests & Linking Management
  getConnectionRequests(): ConnectionRequest[] {
    if (typeof window === "undefined") return DEFAULT_CONNECTION_REQUESTS;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONNECTION_REQUESTS);
      return stored ? JSON.parse(stored) : DEFAULT_CONNECTION_REQUESTS;
    } catch {
      return DEFAULT_CONNECTION_REQUESTS;
    }
  }

  saveConnectionRequests(reqs: ConnectionRequest[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.CONNECTION_REQUESTS, JSON.stringify(reqs));
    this.notify();
  }

  createConnectionRequest(req: Omit<ConnectionRequest, "id" | "createdAt" | "status">): ConnectionRequest {
    const reqs = this.getConnectionRequests();
    const newReq: ConnectionRequest = {
      ...req,
      id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    this.saveConnectionRequests([newReq, ...reqs]);
    this.addAuditLog({
      actorName: req.requestedBy === "PATIENT" ? req.patientName : req.caretakerName,
      actorRole: req.requestedBy === "PATIENT" ? "PATIENT" : "CAREGIVER",
      action: "CARE_LINK_REQUESTED",
      target: `${req.caretakerName} ↔ ${req.patientName}`,
      details: `Connection request sent from ${req.requestedBy.toLowerCase()} (${req.relation}). Status: PENDING approval.`,
      severity: "SECURITY",
    });
    return newReq;
  }

  respondConnectionRequest(requestId: string, newStatus: "APPROVED" | "REJECTED", responderName: string) {
    const reqs = this.getConnectionRequests();
    const target = reqs.find((r) => r.id === requestId);
    if (!target) return;

    const updated = reqs.map((r) =>
      r.id === requestId
        ? { ...r, status: newStatus, respondedAt: new Date().toISOString() }
        : r
    );
    this.saveConnectionRequests(updated);

    // If approved, create or update the active PatientCaregiverRelationship
    if (newStatus === "APPROVED") {
      const rels = this.getRelationships();
      const existingRel = rels.find(
        (rel) =>
          (rel.patientId === target.patientId || rel.patientPhone === target.patientPhone) &&
          (rel.caregiverId === target.caretakerId || rel.caregiverPhone === target.caretakerPhone)
      );

      if (!existingRel) {
        this.addRelationship({
          patientId: target.patientId,
          patientName: target.patientName,
          patientPhone: target.patientPhone,
          caregiverId: target.caretakerId,
          caregiverName: target.caretakerName,
          caregiverEmail: `${target.caretakerName.toLowerCase().replace(/\s+/g, "")}@elderlycare.ai`,
          caregiverPhone: target.caretakerPhone,
          relation: target.relation,
          permissions: ["VIEW_SCHEDULE", "EDIT_MEDICINES", "RECEIVE_EMERGENCY_ALERTS", "VOICE_MESSAGES"],
          status: "ACTIVE",
        });
      }
    }

    this.addAuditLog({
      actorName: responderName,
      actorRole: "PATIENT",
      action: newStatus === "APPROVED" ? "CARE_LINK_APPROVED" : "CARE_LINK_REJECTED",
      target: `${target.caretakerName} ↔ ${target.patientName}`,
      details: `Connection request was ${newStatus.toLowerCase()} by ${responderName}`,
      severity: newStatus === "APPROVED" ? "SECURITY" : "WARNING",
    });
  }

  getApprovedCaretakersForPatient(patientPhoneOrId: string): ConnectionRequest[] {
    const cleanPhone = patientPhoneOrId.replace(/[^0-9]/g, "");
    return this.getConnectionRequests().filter(
      (r) =>
        r.status === "APPROVED" &&
        (r.patientId === patientPhoneOrId ||
          r.patientPhone.replace(/[^0-9]/g, "").includes(cleanPhone) ||
          cleanPhone.includes(r.patientPhone.replace(/[^0-9]/g, "")))
    );
  }

  getApprovedPatientsForCaretaker(caretakerPhoneOrId: string): ConnectionRequest[] {
    const cleanPhone = caretakerPhoneOrId.replace(/[^0-9]/g, "");
    return this.getConnectionRequests().filter(
      (r) =>
        r.status === "APPROVED" &&
        (r.caretakerId === caretakerPhoneOrId ||
          r.caretakerPhone.replace(/[^0-9]/g, "").includes(cleanPhone) ||
          cleanPhone.includes(r.caretakerPhone.replace(/[^0-9]/g, "")))
    );
  }

  getPendingRequestsForUser(phoneOrId: string, role: UserRole): ConnectionRequest[] {
    const cleanPhone = phoneOrId.replace(/[^0-9]/g, "");
    return this.getConnectionRequests().filter((r) => {
      if (r.status !== "PENDING") return false;
      if (role === "PATIENT") {
        // Patient receives requests where they did not initiate
        const pPhone = r.patientPhone.replace(/[^0-9]/g, "");
        return (
          (r.patientId === phoneOrId || pPhone.includes(cleanPhone) || cleanPhone.includes(pPhone)) &&
          r.requestedBy === "CAREGIVER"
        );
      } else if (role === "CAREGIVER") {
        // Caretaker receives requests where patient initiated
        const cPhone = r.caretakerPhone.replace(/[^0-9]/g, "");
        return (
          (r.caretakerId === phoneOrId || cPhone.includes(cleanPhone) || cleanPhone.includes(cPhone)) &&
          r.requestedBy === "PATIENT"
        );
      }
      return false;
    });
  }

  // Audit Logs
  getAuditLogs(): SystemAuditLog[] {
    if (typeof window === "undefined") return DEFAULT_AUDIT_LOGS;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      return stored ? JSON.parse(stored) : DEFAULT_AUDIT_LOGS;
    } catch {
      return DEFAULT_AUDIT_LOGS;
    }
  }

  saveAuditLogs(logs: SystemAuditLog[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
    this.notify();
  }

  addAuditLog(log: Omit<SystemAuditLog, "id" | "timestamp">) {
    const logs = this.getAuditLogs();
    const newLog: SystemAuditLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " (" + new Date().toLocaleDateString() + ")",
    };
    this.saveAuditLogs([newLog, ...logs.slice(0, 49)]); // Keep last 50 logs
    return newLog;
  }

  resetToDefaults() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEYS.MEDICINES);
    localStorage.removeItem(STORAGE_KEYS.DOSES);
    localStorage.removeItem(STORAGE_KEYS.PATIENT);
    localStorage.removeItem(STORAGE_KEYS.PATIENTS_LIST);
    localStorage.removeItem(STORAGE_KEYS.ALERTS);
    localStorage.removeItem(STORAGE_KEYS.MESSAGES);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.RELATIONSHIPS);
    localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
    this.notify();
  }
}

export const storage = new StorageService();
