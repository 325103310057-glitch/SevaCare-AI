import React, { useState } from "react";
import {
  HelpCircle,
  X,
  Mic,
  Volume2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PackageX,
  ShieldAlert,
  MessageSquare,
  Sparkles,
  Play,
  Languages,
  ArrowRight,
  Search,
} from "lucide-react";
import { soundFx, speakText } from "../utils/audio";

export interface VoiceCommandCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
  description: string;
  commands: {
    phrase: string;
    actionOutcome: string;
    variations: string[];
    urgencyLevel?: "NORMAL" | "WARNING" | "URGENT" | "EMERGENCY";
    multilingualExample?: string;
  }[];
}

interface VoiceHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCommand: (commandText: string) => void;
  patientLanguage: string;
  languageCode: string;
  patientName: string;
  activeMedicineName?: string;
}

export const VoiceHelpModal: React.FC<VoiceHelpModalProps> = ({
  isOpen,
  onClose,
  onSelectCommand,
  patientLanguage,
  languageCode,
  patientName,
  activeMedicineName = "medicine",
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  if (!isOpen) return null;

  const categories: VoiceCommandCategory[] = [
    {
      id: "friendly_companion",
      name: "🌸 Friendly Companion & Chat",
      icon: <Sparkles size={18} className="text-rose-600" />,
      badgeColor: "text-rose-900",
      badgeBg: "bg-rose-100",
      badgeBorder: "border-rose-300",
      description: "Talk freely anytime with your AI companion — hear stories, positive thoughts, or share your day.",
      commands: [
        {
          phrase: "I am feeling lonely today, can you talk with me?",
          actionOutcome: "AI responds with comforting, loving company, gentle questions, and attentive listening.",
          variations: [
            "Hello, how are you today?",
            "I want someone to talk to for a little while.",
            "Tell me something interesting or uplifting.",
            "I was thinking about my grandchildren today.",
          ],
          multilingualExample: "Mujhe akela lag raha hai, baat karo (Hindi) / Naatho matladu (Telugu)",
          urgencyLevel: "NORMAL",
        },
        {
          phrase: "Tell me a short pleasant story.",
          actionOutcome: "Narrates a warm, heartwarming classic fable, folklore, or inspiring moral tale.",
          variations: [
            "Tell me an inspiring tale from history.",
            "Can you tell me a Tenali Rama or Panchatantra story?",
            "Tell me a cheerful bedtime story.",
          ],
          multilingualExample: "Ek achhi kahani sunao (Hindi) / O manchi katha cheppandi (Telugu)",
          urgencyLevel: "NORMAL",
        },
        {
          phrase: "What is a positive thought for today?",
          actionOutcome: "Shares an inspiring proverb, daily blessing, or gentle mindfulness breathing exercise.",
          variations: [
            "Give me some morning wisdom.",
            "Tell me a light-hearted joke to make me smile.",
            "Can you do a 30-second breathing exercise with me?",
          ],
          multilingualExample: "Aaj ka suvichar batao (Hindi) / Ee roju manchi maata cheppandi (Telugu)",
          urgencyLevel: "NORMAL",
        },
      ],
    },
    {
      id: "medicine_taken",
      name: "Medicine Taken",
      icon: <CheckCircle2 size={18} className="text-emerald-700" />,
      badgeColor: "text-emerald-900",
      badgeBg: "bg-emerald-100",
      badgeBorder: "border-emerald-300",
      description: "Confirm you have taken your pills to stop alarms and update your family.",
      commands: [
        {
          phrase: "I have taken my medicine.",
          actionOutcome: "Marks scheduled dose as taken, updates caregiver dashboard, and stops repeat reminder alarms.",
          variations: [
            "I took my morning pills.",
            "Yes, I swallowed my tablet with water.",
            "Done taking medicine.",
            "Already taken with breakfast.",
          ],
          multilingualExample: "Maine davai le li hai (Hindi) / Nenu mandulu vesukunnanu (Telugu)",
          urgencyLevel: "NORMAL",
        },
        {
          phrase: "I took my Metformin with food.",
          actionOutcome: "Confirms specific medicine name and logs exact timestamp.",
          variations: [
            `I just took my ${activeMedicineName}.`,
            "Pills are taken, thank you.",
          ],
          urgencyLevel: "NORMAL",
        },
      ],
    },
    {
      id: "postpone_snooze",
      name: "Snooze / In 10 Minutes",
      icon: <Clock size={18} className="text-amber-700" />,
      badgeColor: "text-amber-900",
      badgeBg: "bg-amber-100",
      badgeBorder: "border-amber-300",
      description: "Tell the assistant you are getting water, eating, or will take it in a few minutes.",
      commands: [
        {
          phrase: "I will take it now.",
          actionOutcome: "Starts a gentle 10-minute follow-up timer before checking in again.",
          variations: [
            "Give me 5 minutes, I am getting water.",
            "I am finishing my lunch and will take it right after.",
            "I will take it in 10 minutes.",
            "Remind me in a little while.",
          ],
          multilingualExample: "Abhi le raha hoon (Hindi) / Ippude vesukunta (Telugu)",
          urgencyLevel: "NORMAL",
        },
      ],
    },
    {
      id: "medicine_inquiry",
      name: "Ask Schedule & Pill Details",
      icon: <HelpCircle size={18} className="text-teal-700" />,
      badgeColor: "text-teal-900",
      badgeBg: "bg-teal-100",
      badgeBorder: "border-teal-300",
      description: "Ask what medicine to take right now, when the next dose is, or meal instructions.",
      commands: [
        {
          phrase: "When is my next medicine?",
          actionOutcome: "AI checks your daily schedule and speaks aloud the exact medicine name and time.",
          variations: [
            "What time is my afternoon dose?",
            "What medicine do I need to take right now?",
            "Do I take this before or after meals?",
          ],
          multilingualExample: "Meri agli davai kab hai? (Hindi) / Naa tharuvatha mandhu eppudu? (Telugu)",
          urgencyLevel: "NORMAL",
        },
      ],
    },
    {
      id: "health_symptoms",
      name: "Feeling Unwell & Symptoms",
      icon: <AlertTriangle size={18} className="text-orange-700" />,
      badgeColor: "text-orange-900",
      badgeBg: "bg-orange-100",
      badgeBorder: "border-orange-300",
      description: "Report health discomfort or dizziness. AI notifies your caregiver with urgent priority.",
      commands: [
        {
          phrase: "I feel dizzy.",
          actionOutcome: "Sends an URGENT Health Symptom alert with transcript translation to your caregiver.",
          variations: [
            "I am feeling weak and dizzy today.",
            "My head is spinning when I stand up.",
            "I have a severe headache.",
            "I feel nauseous after taking the pill.",
          ],
          multilingualExample: "Mujhe chakkar aa rahe hain (Hindi) / Naaku thala thiruguthondi (Telugu)",
          urgencyLevel: "URGENT",
        },
        {
          phrase: "My chest feels tight and painful.",
          actionOutcome: "Triggers HIGH-PRIORITY health alert to family and logs the symptom description.",
          variations: [
            "I have pain in my chest.",
            "I have stomach ache.",
            "I am having difficulty breathing.",
          ],
          multilingualExample: "Seene mein dard hai (Hindi) / Chaathilo noppi ga undi (Telugu)",
          urgencyLevel: "EMERGENCY",
        },
      ],
    },
    {
      id: "medicine_stock",
      name: "Medicine Unavailable / Refill",
      icon: <PackageX size={18} className="text-amber-800" />,
      badgeColor: "text-amber-900",
      badgeBg: "bg-amber-100",
      badgeBorder: "border-amber-300",
      description: "Let family know if strips are empty or pills are missing.",
      commands: [
        {
          phrase: "I don't have the medicine.",
          actionOutcome: "Flags a REFILL NEEDED notification on the caregiver dashboard.",
          variations: [
            "My medicine strip is finished.",
            "The bottle is empty.",
            "I cannot find my pills in the box.",
          ],
          multilingualExample: "Davai khatam ho gayi hai (Hindi) / Mandulu aipoyayi (Telugu)",
          urgencyLevel: "WARNING",
        },
      ],
    },
    {
      id: "emergency_sos",
      name: "Emergency SOS & Help",
      icon: <ShieldAlert size={18} className="text-rose-700" />,
      badgeColor: "text-rose-900",
      badgeBg: "bg-rose-100",
      badgeBorder: "border-rose-300",
      description: "Immediate emergency help. Sounds loud alert and calls caregiver immediately.",
      commands: [
        {
          phrase: "I need help.",
          actionOutcome: "Sounds emergency chime, marks priority as EMERGENCY, and sends urgent SMS/app alert to family.",
          variations: [
            "Help me please, I fell down.",
            "Emergency, please call someone immediately!",
            "I need someone to come to my room.",
          ],
          multilingualExample: "Mujhe madad chahiye (Hindi) / Naaku saahayam kaavali (Telugu)",
          urgencyLevel: "EMERGENCY",
        },
      ],
    },
    {
      id: "family_notes",
      name: "Message to Caretaker",
      icon: <MessageSquare size={18} className="text-teal-700" />,
      badgeColor: "text-teal-900",
      badgeBg: "bg-teal-100",
      badgeBorder: "border-teal-300",
      description: "Send conversational voice notes directly to your family/caregiver.",
      commands: [
        {
          phrase: "Please tell Rahul to call me.",
          actionOutcome: "Translates and posts your voice message directly to the family message log.",
          variations: [
            "Can someone bring me warm water?",
            "Tell my daughter I am doing well today.",
            "Tell Rahul I need fresh fruits from the store.",
          ],
          multilingualExample: "Rahul se kaho mujhe call kare (Hindi) / Rahul tho call cheyyamani cheppandi (Telugu)",
          urgencyLevel: "NORMAL",
        },
      ],
    },
  ];

  // Filter commands
  const filteredCategories = categories
    .map((cat) => {
      if (selectedCategory !== "all" && cat.id !== selectedCategory) {
        return null;
      }
      if (!searchQuery.trim()) return cat;

      const filteredCommands = cat.commands.filter(
        (cmd) =>
          cmd.phrase.toLowerCase().includes(searchQuery.toLowerCase()) ||
          cmd.variations.some((v) => v.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (cmd.multilingualExample && cmd.multilingualExample.toLowerCase().includes(searchQuery.toLowerCase())) ||
          cmd.actionOutcome.toLowerCase().includes(searchQuery.toLowerCase())
      );

      if (filteredCommands.length === 0) return null;
      return { ...cat, commands: filteredCommands };
    })
    .filter(Boolean) as VoiceCommandCategory[];

  const handleHearAudio = (text: string) => {
    soundFx.playMicClick();
    speakText(text, languageCode, 1.0, 0.95);
  };

  const handleTryCommand = (text: string) => {
    soundFx.playSuccessChime();
    onClose();
    onSelectCommand(text);
  };

  return (
    <div
      id="modal-voice-help-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="modal-voice-help-content"
        className="bg-white rounded-3xl max-w-2xl w-full my-auto shadow-2xl border-3 border-teal-600 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95"
      >
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-teal-800 to-emerald-900 text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-600/50 border border-teal-400/50 flex items-center justify-center text-teal-200 shadow-inner">
              <Mic size={26} className="text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Voice Commands & Help Guide
                </h2>
                <span className="bg-emerald-400 text-emerald-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                  AI Powered
                </span>
              </div>
              <p className="text-xs sm:text-sm text-teal-100 font-medium mt-0.5">
                Speak naturally in {patientLanguage} or English • No exact keywords required
              </p>
            </div>
          </div>

          <button
            id="btn-close-voice-help"
            type="button"
            onClick={onClose}
            aria-label="Close Voice Help"
            className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-lg cursor-pointer transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="p-4 sm:p-5 bg-stone-50 border-b border-stone-200 shrink-0 flex flex-col gap-3">
          {/* Quick Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              id="input-voice-help-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search phrases (e.g., 'dizzy', 'taken medicine', 'help', 'refill')..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border-2 border-stone-200 focus:border-teal-600 focus:outline-none text-sm font-semibold text-stone-800 placeholder-stone-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold px-1.5 py-0.5 bg-stone-100 rounded"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
            <button
              id="filter-cat-all"
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-teal-700 text-white shadow-xs"
                  : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
              }`}
            >
              All Commands
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                id={`filter-cat-${cat.id}`}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-teal-700 text-white shadow-xs"
                    : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
                }`}
              >
                {cat.icon}
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Command Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-6">
          {/* Senior Friendly Quick Guide Banner */}
          <div className="bg-emerald-50 rounded-2xl p-4 border-2 border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-200 text-emerald-900 flex items-center justify-center font-bold text-lg shrink-0">
                💡
              </div>
              <div className="text-xs sm:text-sm text-emerald-950 font-medium">
                <span className="font-extrabold text-emerald-900 block text-sm">
                  How to speak to your assistant:
                </span>
                Tap the big green Voice Orb, wait for the chime, and speak in your natural everyday tone.
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 shrink-0">
              <Languages size={14} />
              <span>Handles 12+ Languages</span>
            </div>
          </div>

          {/* List of Command Categories */}
          {filteredCategories.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-stone-500 font-semibold text-sm">
                No voice commands match "{searchQuery}".
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="mt-2 text-xs font-bold text-teal-700 underline cursor-pointer"
              >
                Show all available commands
              </button>
            </div>
          ) : (
            filteredCategories.map((category) => (
              <div key={category.id} className="flex flex-col gap-3">
                {/* Category Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded-lg ${category.badgeBg} border ${category.badgeBorder}`}>
                      {category.icon}
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-stone-900">
                      {category.name}
                    </h3>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${category.badgeBg} ${category.badgeColor} border ${category.badgeBorder}`}>
                    {category.commands.length} {category.commands.length === 1 ? "Command" : "Commands"}
                  </span>
                </div>

                <p className="text-xs text-stone-500 -mt-1 font-medium">
                  {category.description}
                </p>

                {/* Commands in this category */}
                <div className="flex flex-col gap-3">
                  {category.commands.map((cmd, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-stone-200 hover:border-teal-400 transition-all shadow-xs flex flex-col gap-3"
                    >
                      {/* Top Row: Primary phrase + urgency badge + action buttons */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base sm:text-lg font-extrabold text-stone-900 font-sans tracking-tight">
                            "{cmd.phrase}"
                          </span>
                          {cmd.urgencyLevel && cmd.urgencyLevel !== "NORMAL" && (
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                cmd.urgencyLevel === "EMERGENCY"
                                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                                  : cmd.urgencyLevel === "URGENT"
                                  ? "bg-orange-100 text-orange-800 border border-orange-300"
                                  : "bg-amber-100 text-amber-800 border border-amber-300"
                              }`}
                            >
                              {cmd.urgencyLevel}
                            </span>
                          )}
                        </div>

                        {/* Direct Action Buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <button
                            id={`btn-hear-voice-${category.id}-${idx}`}
                            type="button"
                            onClick={() => handleHearAudio(cmd.phrase)}
                            title="Hear how to speak this phrase"
                            className="bg-stone-100 hover:bg-teal-50 text-stone-700 hover:text-teal-900 border border-stone-300 hover:border-teal-300 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Volume2 size={15} className="text-teal-700" />
                            <span>Hear Audio</span>
                          </button>

                          <button
                            id={`btn-try-voice-${category.id}-${idx}`}
                            type="button"
                            onClick={() => handleTryCommand(cmd.phrase)}
                            title="Simulate speaking this command to the assistant"
                            className="bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                          >
                            <Mic size={14} />
                            <span>Try Speaking This</span>
                          </button>
                        </div>
                      </div>

                      {/* What SevaCare AI does */}
                      <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 text-xs sm:text-sm font-medium text-stone-700 flex items-start gap-2">
                        <Sparkles size={16} className="text-teal-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-stone-900">What happens: </span>
                          {cmd.actionOutcome}
                        </div>
                      </div>

                      {/* Other everyday variations you can say */}
                      {cmd.variations && cmd.variations.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mr-1">
                            Also understands:
                          </span>
                          {cmd.variations.map((variation, vIdx) => (
                            <button
                              key={vIdx}
                              type="button"
                              onClick={() => handleTryCommand(variation)}
                              className="bg-stone-100 hover:bg-teal-50 text-stone-700 hover:text-teal-900 border border-stone-200 hover:border-teal-300 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                            >
                              "{variation}"
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Multilingual phrasing example */}
                      {cmd.multilingualExample && (
                        <div className="text-[11px] text-stone-500 font-medium flex items-center gap-1 bg-stone-50/70 px-2.5 py-1 rounded-lg border border-stone-200/60">
                          <Languages size={13} className="text-teal-600 shrink-0" />
                          <span>{cmd.multilingualExample}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-stone-100 border-t border-stone-200 p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="text-xs text-stone-500 font-medium hidden sm:block">
            SevaCare AI uses Gemini 3.7 Flash for multilingual contextual understanding.
          </div>

          <button
            id="btn-close-voice-help-bottom"
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto bg-stone-800 hover:bg-stone-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-colors"
          >
            Got It, Close Help
          </button>
        </div>
      </div>
    </div>
  );
};
