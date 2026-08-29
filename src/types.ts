export type UserRole = "PATIENT" | "CAREGIVER" | "ADMIN";

export type RoleMode = "PATIENT" | "CAREGIVER" | "ADMIN";

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  phone: string;
  preferredLanguage: string; // e.g. "Telugu", "Hindi", "English"
  languageCode: string; // e.g. "te-IN", "hi-IN", "en-US"
  assignedPatientIds?: string[]; // For Caregivers
  patientProfileId?: string; // For Patients
  caregiverRelation?: string; // e.g. "Son & Primary Caregiver"
  avatarUrl?: string;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  lastLoginAt?: string;
}

export interface ConnectionRequest {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  caretakerId: string;
  caretakerName: string;
  caretakerPhone: string;
  relation: string; // e.g. "Son", "Daughter", "Home Nurse", "Family"
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedBy: "PATIENT" | "CAREGIVER";
  createdAt: string;
  respondedAt?: string;
}

export interface PatientCaregiverRelationship {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  caregiverId: string;
  caregiverName: string;
  caregiverEmail: string;
  caregiverPhone?: string;
  relation: string; // e.g., "Son", "Daughter", "Nurse"
  permissions: ("VIEW_SCHEDULE" | "EDIT_MEDICINES" | "RECEIVE_EMERGENCY_ALERTS" | "VOICE_MESSAGES")[];
  status: "ACTIVE" | "PENDING" | "PAUSED";
  assignedAt: string;
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  target: string;
  details: string;
  severity: "INFO" | "WARNING" | "SECURITY" | "ALERT";
}

export type MealTiming = "AFTER_MEAL" | "BEFORE_MEAL" | "WITH_MEAL" | "ANYTIME";

export type PillIconType = "tablet" | "capsule" | "syrup" | "drops" | "injection";

export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  purpose: string;
  scheduleType: "DAILY" | "TWICE_DAILY" | "THRICE_DAILY" | "WEEKLY" | "CUSTOM";
  times: string[]; // e.g., ["08:00", "20:00"]
  mealTiming: MealTiming;
  instructions: string;
  pillColor: string; // Tailwind hex / class
  iconType: PillIconType;
  remainingPills: number;
  totalPills: number;
  active: boolean;
  prescribedBy?: string;
}

export type ReminderStatus =
  | "PENDING"
  | "REMINDING_STAGE_1"
  | "WAITING_10_MIN"
  | "REMINDING_STAGE_2"
  | "CONFIRMED_TAKEN"
  | "WILL_TAKE_LATER"
  | "MISSED"
  | "CARE_ALERTED";

export interface ScheduledDose {
  id: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  scheduledTime: string; // "08:00 AM"
  scheduledTime24: string; // "08:00"
  instructions: string;
  mealTiming: MealTiming;
  iconType: PillIconType;
  pillColor: string;
  status: ReminderStatus;
  stage: 1 | 2;
  firstRemindedAt?: string;
  secondRemindedAt?: string;
  confirmedAt?: string;
  patientResponse?: string;
  spokenAudioText?: string;
}

export interface PatientProfile {
  id: string;
  name: string;
  relation: string;
  age: number;
  preferredLanguage: string; // e.g. "English", "Hindi", "Telugu", "Tamil", "Spanish"
  languageCode: string; // e.g. "en-US", "hi-IN", "te-IN", "ta-IN", "es-ES"
  phone: string;
  location: string;
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  };
  doctorContact: {
    name: string;
    specialty: string;
    phone: string;
  };
  voiceVolume: number; // 0.1 - 1.0
  voiceSpeed: number; // 0.8 - 1.2
}

export type IntentCategory = "general inquiry/chat" | "medicine status update" | "emergency help";

export interface VoiceClassificationResult {
  intent: string;
  category: IntentCategory;
  confidence: number;
  spokenResponse: string;
  englishTranslation?: string;
  alertLevel: "NORMAL" | "WARNING" | "URGENT" | "EMERGENCY";
  symptomSummary?: string;
  caregiverNote?: string;
  followUpPrompt?: string;
  actionToTake: "MARK_TAKEN" | "SNOOZE_10_MIN" | "ANSWER_QUERY" | "ALERT_CAREGIVER" | "SEND_MESSAGE" | "CONTINUE_CONVERSATION" | "RETRY_LISTEN";
}

export interface CaregiverAlert {
  id: string;
  timestamp: string;
  type: "MISSED_MEDICINE" | "PATIENT_UNWELL" | "EMERGENCY_SOS" | "MEDICINE_OUT" | "VOICE_NOTE" | "CONFIRMED";
  priority: "EMERGENCY" | "URGENT" | "WARNING" | "INFO";
  title: string;
  message: string;
  patientName: string;
  category?: IntentCategory;
  medicineName?: string;
  transcript?: string;
  englishTranslation?: string;
  symptomSummary?: string;
  acknowledged: boolean;
  createdAt: number;
}

export interface VoiceMessage {
  id: string;
  timestamp: string;
  sender: "PATIENT" | "CAREGIVER";
  text: string;
  category?: IntentCategory;
  translation?: string;
  language: string;
  urgency?: "NORMAL" | "WARNING" | "EMERGENCY";
  createdAt: number;
}

export interface ConversationTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
  category?: IntentCategory | "COMPANION" | "CARE";
  intent?: string;
  timestamp: string;
}

export interface CompanionTopicCard {
  id: string;
  title: string;
  category: "STORY" | "WISDOM" | "CHECKIN" | "MEMORY" | "JOKE" | "CARE";
  icon: string;
  promptText: string;
  description: string;
}

export interface LanguageOption {
  code: string;
  speechCode: string;
  name: string;
  nativeName: string;
  flag: string;
  sampleGreeting: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", speechCode: "en-US", name: "English", nativeName: "English", flag: "🇺🇸", sampleGreeting: "Good morning! I am your AI companion and care assistant." },
  { code: "hi", speechCode: "hi-IN", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳", sampleGreeting: "नमस्ते! मैं आपकी सेवा और देखभाल के लिए हमेशा उपस्थित हूँ।" },
  { code: "te", speechCode: "te-IN", name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳", sampleGreeting: "నమస్కారం! మీ ఆరోగ్యం మరియు సంరక్షణ కోసం నేను సిద్ధంగా ఉన్నాను." },
  { code: "ta", speechCode: "ta-IN", name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳", sampleGreeting: "வணக்கம்! உங்கள் நலம் மற்றும் உதவிக்கு நான் எப்போதும் உடன் இருக்கிறேன்." },
  { code: "kn", speechCode: "kn-IN", name: "Kannada", nativeName: "ಕನ್ನಡ", flag: "🇮🇳", sampleGreeting: "ನಮಸ್ಕಾರ! ನಿಮ್ಮ ಯೋಗಕ್ಷೇಮಕ್ಕಾಗಿ ನಾನು ಇಲ್ಲಿದ್ದೇನೆ." },
  { code: "gu", speechCode: "gu-IN", name: "Gujarati", nativeName: "ગુજરાતી", flag: "🇮🇳", sampleGreeting: "નમસ્તે! તમારી સંભાળ અને વાતચીત માટે હું તૈયાર છું." },
  { code: "mr", speechCode: "mr-IN", name: "Marathi", nativeName: "मराठी", flag: "🇮🇳", sampleGreeting: "नमस्कार! तुमच्या काळजीसाठी आणि गप्पांसाठी मी येथे आहे." },
  { code: "bn", speechCode: "bn-IN", name: "Bengali", nativeName: "বাংলা", flag: "🇮🇳", sampleGreeting: "নমস্কার! আপনার দেখাশোনা এবং সাহচর্যের জন্য আমি প্রস্তুত।" },
  { code: "es", speechCode: "es-ES", name: "Spanish", nativeName: "Español", flag: "🇪🇸", sampleGreeting: "¡Hola! Estoy aquí para acompañarle y recordarle sus medicinas." },
];
