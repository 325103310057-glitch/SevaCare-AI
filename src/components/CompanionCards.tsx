import React, { useEffect, useState } from "react";
import { Sparkles, BookOpen, Heart, Smile, Wind, RefreshCw, MessageSquarePlus } from "lucide-react";
import { soundFx } from "../utils/audio";

interface CompanionCardsProps {
  patientName: string;
  patientLanguage: string;
  onSelectPrompt: (prompt: string) => void;
}

interface DailyTopics {
  morningThought?: string;
  dailyStoryPrompt?: string;
  gentleCheckIn?: string;
  mindfulnessTip?: string;
}

export const CompanionCards: React.FC<CompanionCardsProps> = ({
  patientName,
  patientLanguage,
  onSelectPrompt,
}) => {
  const [dailyTopics, setDailyTopics] = useState<DailyTopics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/companion-topics?language=${encodeURIComponent(patientLanguage)}&name=${encodeURIComponent(
          patientName.split(" ")[0]
        )}`
      );
      const data = await res.json();
      if (data.success) {
        setDailyTopics(data);
      }
    } catch (e) {
      console.warn("Failed to fetch companion topics", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, [patientLanguage, patientName]);

  const quickPrompts = [
    {
      id: "story",
      title: "Tell Me a Story",
      icon: <BookOpen className="text-amber-600" size={20} />,
      bg: "bg-amber-50 hover:bg-amber-100 border-amber-200",
      textColor: "text-amber-900",
      prompt: "Tell me a short pleasant story to brighten my day.",
      subtext: "Folklore, classic fables & heartwarming tales",
    },
    {
      id: "chat",
      title: "Talk With Me",
      icon: <Heart className="text-rose-600" size={20} />,
      bg: "bg-rose-50 hover:bg-rose-100 border-rose-200",
      textColor: "text-rose-900",
      prompt: "Hello! I would love to chat for a few minutes. How are you today?",
      subtext: "Friendly conversation & warm companionship",
    },
    {
      id: "joke",
      title: "Tell a Gentle Joke",
      icon: <Smile className="text-emerald-600" size={20} />,
      bg: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200",
      textColor: "text-emerald-900",
      prompt: "Can you tell me a cheerful, clean joke or riddle to make me smile?",
      subtext: "Light-hearted humor & smiles",
    },
    {
      id: "mindful",
      title: "Peaceful Breath",
      icon: <Wind className="text-teal-600" size={20} />,
      bg: "bg-teal-50 hover:bg-teal-100 border-teal-200",
      textColor: "text-teal-900",
      prompt: "Let's do a gentle 30-second breathing exercise together.",
      subtext: "Relaxation & calm mindfulness",
    },
  ];

  return (
    <div className="bg-gradient-to-br from-rose-50/70 via-amber-50/40 to-stone-50 rounded-3xl p-5 sm:p-6 border-2 border-rose-200/80 shadow-sm flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-rose-200/80 border border-rose-300 text-rose-800 flex items-center justify-center font-bold shadow-2xs">
            🌸
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-black text-stone-900">
                Friendly AI Companion
              </h3>
              <span className="bg-rose-200 text-rose-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                Warm & Patient
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-stone-600">
              Here to talk, share stories, and keep you company 24/7
            </p>
          </div>
        </div>

        <button
          id="btn-refresh-companion-topics"
          type="button"
          onClick={() => {
            soundFx.playMicClick();
            fetchTopics();
          }}
          disabled={loading}
          title="Refresh daily reflection"
          className="w-8 h-8 rounded-xl bg-white/80 hover:bg-white text-stone-600 hover:text-stone-900 border border-stone-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-rose-600" : ""} />
        </button>
      </div>

      {/* Daily Uplifting Thought Banner */}
      {dailyTopics?.morningThought && (
        <div className="bg-white/90 rounded-2xl p-4 border border-rose-200/80 shadow-2xs flex items-start gap-3">
          <Sparkles size={20} className="text-rose-500 shrink-0 mt-0.5" />
          <div className="text-left flex-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 block mb-0.5">
              Daily Blessing & Positive Thought:
            </span>
            <p className="text-sm sm:text-base font-semibold text-stone-800 italic">
              "{dailyTopics.morningThought}"
            </p>
          </div>
        </div>
      )}

      {/* Quick Launch Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {quickPrompts.map((item) => (
          <button
            key={item.id}
            id={`btn-companion-quick-${item.id}`}
            type="button"
            onClick={() => {
              soundFx.playMicClick();
              onSelectPrompt(item.prompt);
            }}
            className={`${item.bg} border-2 rounded-2xl p-3.5 text-left flex items-start gap-3 cursor-pointer transition-all active:scale-95 shadow-2xs`}
          >
            <div className="p-2 rounded-xl bg-white/80 shadow-2xs shrink-0">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`font-black text-sm sm:text-base ${item.textColor}`}>
                {item.title}
              </div>
              <div className="text-xs font-medium text-stone-600 truncate mt-0.5">
                {item.subtext}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
