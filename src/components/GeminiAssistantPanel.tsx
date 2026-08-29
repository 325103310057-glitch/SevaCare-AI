import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Search,
  MapPin,
  Mic,
  MicOff,
  Send,
  Loader2,
  Radio,
  ExternalLink,
  Bot,
  User,
  Zap,
  Brain,
  Layers,
  FileText,
  Volume2,
  AlertCircle,
  X,
} from "lucide-react";
import { soundFx, speakText } from "../utils/audio";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  modelUsed?: string;
  taskComplexity?: "fast" | "general" | "complex";
  timestamp: string;
  sources?: Array<{ title: string; uri: string }>;
  places?: Array<{ title: string; uri: string }>;
}

interface GeminiAssistantPanelProps {
  patientName?: string;
  patientLanguage?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const GeminiAssistantPanel: React.FC<GeminiAssistantPanelProps> = ({
  patientName = "Elderly Patient",
  patientLanguage = "English",
  isOpen,
  onClose,
}) => {
  // Tabs: Chatbot, Search Grounding, Maps Grounding, Live Voice, Audio Transcribe
  const [activeTab, setActiveTab] = useState<"chat" | "search" | "maps" | "live" | "transcribe">("chat");

  // Chatbot State
  const [taskComplexity, setTaskComplexity] = useState<"fast" | "general" | "complex">("general");
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "init-1",
      role: "assistant",
      text: `Hello! I am your AI Medical & Care Companion powered by Gemini. You can switch model tiers (Fast with gemini-3.1-flash-lite, General with gemini-3.5-flash, or Complex with gemini-3.1-pro-preview) or explore Search Grounding, Maps Grounding, and Live Voice conversations.`,
      modelUsed: "gemini-3.5-flash",
      taskComplexity: "general",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  // Search Grounding State
  const [searchPrompt, setSearchPrompt] = useState("");
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    text: string;
    sources: Array<{ title: string; uri: string }>;
    searchQueries: string[];
    model: string;
  } | null>(null);

  // Maps Grounding State
  const [mapsPrompt, setMapsPrompt] = useState("Find the nearest 24/7 pharmacies, geriatric clinics, and emergency hospitals nearby.");
  const [isMapsLoading, setIsMapsLoading] = useState(false);
  const [mapsResult, setMapsResult] = useState<{
    text: string;
    places: Array<{ title: string; uri: string }>;
    model: string;
  } | null>(null);

  // Transcribe State
  const [isRecordingTranscribe, setIsRecordingTranscribe] = useState(false);
  const [transcribeResult, setTranscribeResult] = useState<string>("");
  const [isTranscribeLoading, setIsTranscribeLoading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Live API Voice State
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [liveStatus, setLiveStatus] = useState<string>("Disconnected");
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, searchResult, mapsResult]);

  // Clean up Live session on unmount or tab switch
  useEffect(() => {
    return () => {
      stopLiveSession();
    };
  }, []);

  // ---------------------------------------------
  // 1. CHATBOT HANDLER
  // ---------------------------------------------
  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userText = chatInput.trim();
    setChatInput("");
    soundFx.playTap();

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newHistory = [...chatMessages, userMessage];
    setChatMessages(newHistory);
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, text: m.text })),
          taskComplexity,
          patientName,
          language: patientLanguage,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reach AI Chatbot");

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        text: data.text || "I am here to assist with your medical questions and schedule.",
        modelUsed: data.modelUsed,
        taskComplexity: data.taskComplexity,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setChatMessages((prev) => [...prev, botMessage]);
      soundFx.playSuccessChime();
    } catch (err: any) {
      console.error("Chat error:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          role: "assistant",
          text: `⚠️ Error: ${err.message || "Failed to process chat response."}. Please verify connectivity.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // ---------------------------------------------
  // 2. SEARCH GROUNDING HANDLER
  // ---------------------------------------------
  const handleSearchGrounding = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchPrompt.trim() || isSearchLoading) return;

    setIsSearchLoading(true);
    setSearchResult(null);
    soundFx.playTap();

    try {
      const res = await fetch("/api/ai/search-grounding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: searchPrompt.trim(),
          patientContext: `Patient Name: ${patientName}, Preferred Language: ${patientLanguage}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search grounding failed");

      setSearchResult({
        text: data.text,
        sources: data.sources || [],
        searchQueries: data.searchQueries || [],
        model: data.model || "gemini-3.5-flash",
      });
      soundFx.playSuccessChime();
    } catch (err: any) {
      console.error("Search Grounding Error:", err);
      alert(`Search Grounding Error: ${err.message}`);
    } finally {
      setIsSearchLoading(false);
    }
  };

  // ---------------------------------------------
  // 3. MAPS GROUNDING HANDLER
  // ---------------------------------------------
  const handleMapsGrounding = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!mapsPrompt.trim() || isMapsLoading) return;

    setIsMapsLoading(true);
    setMapsResult(null);
    soundFx.playTap();

    let latitude: number | undefined;
    let longitude: number | undefined;

    if (navigator.geolocation) {
      try {
        const pos: any = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
        });
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch (geoErr) {
        console.warn("Geolocation skipped or denied:", geoErr);
      }
    }

    try {
      const res = await fetch("/api/ai/maps-grounding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: mapsPrompt.trim(),
          latitude,
          longitude,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Maps grounding failed");

      setMapsResult({
        text: data.text,
        places: data.places || [],
        model: data.model || "gemini-3.5-flash",
      });
      soundFx.playSuccessChime();
    } catch (err: any) {
      console.error("Maps Grounding Error:", err);
      alert(`Maps Grounding Error: ${err.message}`);
    } finally {
      setIsMapsLoading(false);
    }
  };

  // ---------------------------------------------
  // 4. AUDIO TRANSCRIBE HANDLER
  // ---------------------------------------------
  const startTranscribeRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        await processTranscribeBlob(audioBlob);
      };

      mediaRecorder.start();
      setIsRecordingTranscribe(true);
      soundFx.playTap();
    } catch (err: any) {
      console.error("Microphone access error:", err);
      alert("Unable to access microphone for recording: " + err.message);
    }
  };

  const stopTranscribeRecording = () => {
    if (mediaRecorderRef.current && isRecordingTranscribe) {
      mediaRecorderRef.current.stop();
      setIsRecordingTranscribe(false);
    }
  };

  const processTranscribeBlob = async (blob: Blob) => {
    setIsTranscribeLoading(true);
    setTranscribeResult("");

    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;

        const res = await fetch("/api/ai/transcribe-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Audio,
            mimeType: "audio/webm",
            prompt: `Transcribe this patient audio recording verbatim. If spoken in Telugu, Hindi, Tamil, Kannada, or English, provide exact transcript with English translation.`,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Transcription failed");

        setTranscribeResult(data.transcript || "No speech detected in audio.");
        soundFx.playSuccessChime();
        setIsTranscribeLoading(false);
      };
    } catch (err: any) {
      console.error("Transcribe process error:", err);
      setTranscribeResult(`Error transcribing audio: ${err.message}`);
      setIsTranscribeLoading(false);
    }
  };

  // ---------------------------------------------
  // 5. LIVE API (WEBSOCKET + PCM AUDIO)
  // ---------------------------------------------
  const startLiveSession = async () => {
    if (isLiveConnected) return;

    try {
      setLiveStatus("Connecting to Gemini Live...");
      setLiveLogs((prev) => [...prev, "🚀 Initializing WebSocket connection to /live-voice..."]);

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/live-voice`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;
      nextPlayTimeRef.current = outputCtx.currentTime;

      ws.onopen = async () => {
        setIsLiveConnected(true);
        setLiveStatus("Connected & Streaming");
        setLiveLogs((prev) => [...prev, " Connected to Gemini Live (gemini-3.1-flash-live-preview). Starting microphone..."]);
        soundFx.playSuccessChime();

        // Capture Mic at 16kHz
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = stream;
          const source = inputCtx.createMediaStreamSource(stream);
          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          scriptProcessorRef.current = processor;

          source.connect(processor);
          processor.connect(inputCtx.destination);

          processor.onaudioprocess = (e) => {
            if (ws.readyState !== WebSocket.OPEN) return;
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBase64 = float32To16BitPCMBase64(inputData);
            ws.send(JSON.stringify({ audio: pcmBase64 }));
          };
        } catch (micErr: any) {
          console.error("Live Mic Error:", micErr);
          setLiveLogs((prev) => [...prev, `❌ Microphone error: ${micErr.message}`]);
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.error) {
            setLiveLogs((prev) => [...prev, `⚠️ Live Error: ${msg.error}`]);
          }
          if (msg.audio && outputCtx) {
            playRawPCMChunk(outputCtx, msg.audio);
          }
          if (msg.interrupted) {
            setLiveLogs((prev) => [...prev, "⚡ Model turn interrupted by user speech."]);
            nextPlayTimeRef.current = outputCtx.currentTime;
          }
        } catch (e) {
          console.warn("Parse live message error:", e);
        }
      };

      ws.onerror = (err) => {
        console.error("Live WS error:", err);
        setLiveStatus("Error in connection");
        setLiveLogs((prev) => [...prev, "❌ WebSocket error encountered."]);
      };

      ws.onclose = () => {
        setIsLiveConnected(false);
        setLiveStatus("Session Closed");
        setLiveLogs((prev) => [...prev, "🔒 Live session disconnected."]);
      };
    } catch (err: any) {
      console.error("Start Live session failed:", err);
      setLiveStatus("Failed to start");
      setLiveLogs((prev) => [...prev, `❌ Connection failure: ${err.message}`]);
    }
  };

  const stopLiveSession = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }
    setIsLiveConnected(false);
    setLiveStatus("Disconnected");
    soundFx.playTap();
  };

  // Helper: Convert Float32Array to 16-bit PCM Base64
  const float32To16BitPCMBase64 = (float32Arr: Float32Array): string => {
    const buffer = new ArrayBuffer(float32Arr.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Arr.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Arr[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); // Little-endian
    }
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Helper: Gapless Playback of 24kHz Raw PCM Chunks
  const playRawPCMChunk = (ctx: AudioContext, base64PCM: string) => {
    try {
      const binaryString = atob(base64PCM);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      if (nextPlayTimeRef.current < now) {
        nextPlayTimeRef.current = now;
      }

      source.start(nextPlayTimeRef.current);
      nextPlayTimeRef.current += audioBuffer.duration;
    } catch (e) {
      console.warn("Error playing PCM audio chunk:", e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-4xl h-[90vh] max-h-[850px] flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-teal-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center font-black">
              <Sparkles size={22} className="text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">Gemini AI Intelligence Suite</h2>
                <span className="bg-emerald-400/20 text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300/30">
                  Live & Grounded
                </span>
              </div>
              <p className="text-xs text-emerald-100/80">
                Multi-tier Chatbot, Live API Voice, Google Search & Maps Grounding, and Audio Transcription
              </p>
            </div>
          </div>
          <button
            id="close-gemini-suite-btn"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-4 pt-2 gap-2 overflow-x-auto">
          <button
            id="tab-gemini-chat"
            onClick={() => {
              setActiveTab("chat");
              soundFx.playTap();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-t border-x ${
              activeTab === "chat"
                ? "bg-white text-teal-800 border-stone-200 -mb-px shadow-xs"
                : "border-transparent text-stone-600 hover:text-stone-900"
            }`}
          >
            <Bot size={15} />
            Gemini Chatbot
          </button>
          <button
            id="tab-gemini-search"
            onClick={() => {
              setActiveTab("search");
              soundFx.playTap();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-t border-x ${
              activeTab === "search"
                ? "bg-white text-teal-800 border-stone-200 -mb-px shadow-xs"
                : "border-transparent text-stone-600 hover:text-stone-900"
            }`}
          >
            <Search size={15} />
            Search Grounding
          </button>
          <button
            id="tab-gemini-maps"
            onClick={() => {
              setActiveTab("maps");
              soundFx.playTap();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-t border-x ${
              activeTab === "maps"
                ? "bg-white text-teal-800 border-stone-200 -mb-px shadow-xs"
                : "border-transparent text-stone-600 hover:text-stone-900"
            }`}
          >
            <MapPin size={15} />
            Maps Grounding
          </button>
          <button
            id="tab-gemini-live"
            onClick={() => {
              setActiveTab("live");
              soundFx.playTap();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-t border-x ${
              activeTab === "live"
                ? "bg-white text-teal-800 border-stone-200 -mb-px shadow-xs"
                : "border-transparent text-stone-600 hover:text-stone-900"
            }`}
          >
            <Radio size={15} />
            Live Voice (Live API)
          </button>
          <button
            id="tab-gemini-transcribe"
            onClick={() => {
              setActiveTab("transcribe");
              soundFx.playTap();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-t border-x ${
              activeTab === "transcribe"
                ? "bg-white text-teal-800 border-stone-200 -mb-px shadow-xs"
                : "border-transparent text-stone-600 hover:text-stone-900"
            }`}
          >
            <FileText size={15} />
            Transcribe Audio
          </button>
        </div>

        {/* Tab 1: Gemini Chatbot */}
        {activeTab === "chat" && (
          <div className="flex-1 flex flex-col p-4 overflow-hidden bg-stone-50/50">
            {/* Complexity Model Router Bar */}
            <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-xs mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-stone-700">Model Routing Tier:</span>
                <div className="flex bg-stone-100 p-1 rounded-xl gap-1">
                  <button
                    id="tier-fast-btn"
                    onClick={() => {
                      setTaskComplexity("fast");
                      soundFx.playTap();
                    }}
                    className={`px-3 py-1 text-xs font-extrabold rounded-lg transition flex items-center gap-1.5 ${
                      taskComplexity === "fast"
                        ? "bg-teal-700 text-white shadow-xs"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    <Zap size={13} />
                    Fast (gemini-3.1-flash-lite)
                  </button>
                  <button
                    id="tier-general-btn"
                    onClick={() => {
                      setTaskComplexity("general");
                      soundFx.playTap();
                    }}
                    className={`px-3 py-1 text-xs font-extrabold rounded-lg transition flex items-center gap-1.5 ${
                      taskComplexity === "general"
                        ? "bg-teal-700 text-white shadow-xs"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    <Layers size={13} />
                    General (gemini-3.5-flash)
                  </button>
                  <button
                    id="tier-complex-btn"
                    onClick={() => {
                      setTaskComplexity("complex");
                      soundFx.playTap();
                    }}
                    className={`px-3 py-1 text-xs font-extrabold rounded-lg transition flex items-center gap-1.5 ${
                      taskComplexity === "complex"
                        ? "bg-purple-700 text-white shadow-xs"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    <Brain size={13} />
                    Complex (gemini-3.1-pro-preview)
                  </button>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-stone-400">
                Speaking as Companion for {patientName} ({patientLanguage})
              </span>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-xs shadow-xs ${
                      msg.role === "user" ? "bg-teal-700" : "bg-emerald-700"
                    }`}
                  >
                    {msg.role === "user" ? <User size={15} /> : <Bot size={15} />}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-xs ${
                      msg.role === "user"
                        ? "bg-teal-700 text-white rounded-tr-none font-medium"
                        : "bg-white text-stone-800 border border-stone-200 rounded-tl-none"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <div
                      className={`mt-1.5 flex items-center justify-between text-[10px] gap-2 pt-1 border-t ${
                        msg.role === "user" ? "border-teal-600 text-teal-200" : "border-stone-100 text-stone-400"
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      {msg.modelUsed && (
                        <span className="font-mono bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded">
                          {msg.modelUsed}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex items-center gap-2 text-xs text-stone-500 bg-white p-3 rounded-2xl border border-stone-200 w-fit">
                  <Loader2 size={16} className="animate-spin text-teal-700" />
                  Generating response with {taskComplexity === "complex" ? "gemini-3.1-pro-preview" : taskComplexity === "fast" ? "gemini-3.1-flash-lite" : "gemini-3.5-flash"}...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendChat} className="mt-3 flex items-center gap-2">
              <input
                id="gemini-chat-input"
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Ask health questions, medicine advice, or chat in ${patientLanguage}...`}
                className="flex-1 bg-white border border-stone-300 rounded-2xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
                disabled={isChatLoading}
              />
              <button
                id="gemini-chat-send-btn"
                type="submit"
                disabled={!chatInput.trim() || isChatLoading}
                className="bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white p-3 rounded-2xl font-bold transition shrink-0"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Search Grounding */}
        {activeTab === "search" && (
          <div className="flex-1 flex flex-col p-4 overflow-y-auto bg-stone-50/50">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Search size={18} className="text-teal-700" />
                <h3 className="text-sm font-black text-stone-900">Google Search Grounding (gemini-3.5-flash)</h3>
              </div>
              <p className="text-xs text-stone-500 mb-3">
                Queries real-time web search for latest clinical advisories, drug interaction updates, and elder wellness guidelines with verified link sources.
              </p>
              <form onSubmit={handleSearchGrounding} className="flex gap-2">
                <input
                  id="search-grounding-input"
                  type="text"
                  value={searchPrompt}
                  onChange={(e) => setSearchPrompt(e.target.value)}
                  placeholder="e.g. Latest guidelines on Metformin timing with meals or safe exercise for seniors"
                  className="flex-1 bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
                />
                <button
                  id="search-grounding-submit-btn"
                  type="submit"
                  disabled={!searchPrompt.trim() || isSearchLoading}
                  className="bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5"
                >
                  {isSearchLoading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                  Search
                </button>
              </form>
            </div>

            {searchResult && (
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="text-xs font-extrabold text-teal-800">Grounded Search Answer</span>
                  <span className="text-[10px] font-mono bg-teal-50 text-teal-800 px-2 py-0.5 rounded-full border border-teal-200">
                    {searchResult.model}
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-stone-800 leading-relaxed whitespace-pre-wrap">
                  {searchResult.text}
                </div>

                {searchResult.sources.length > 0 && (
                  <div className="border-t border-stone-100 pt-3">
                    <h4 className="text-xs font-black text-stone-700 mb-2 flex items-center gap-1.5">
                      <ExternalLink size={14} className="text-teal-700" />
                      Verified Web Citations & Sources:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {searchResult.sources.map((src, idx) => (
                        <a
                          key={idx}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 hover:bg-teal-50 border border-stone-200 hover:border-teal-300 transition text-xs text-teal-900 font-semibold truncate"
                        >
                          <span className="truncate mr-2">{src.title}</span>
                          <ExternalLink size={13} className="shrink-0 text-teal-600" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Maps Grounding */}
        {activeTab === "maps" && (
          <div className="flex-1 flex flex-col p-4 overflow-y-auto bg-stone-50/50">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs mb-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={18} className="text-teal-700" />
                <h3 className="text-sm font-black text-stone-900">Google Maps Grounding (gemini-3.5-flash)</h3>
              </div>
              <p className="text-xs text-stone-500 mb-3">
                Locates nearby pharmacies, elderly care hospitals, and mobility aid centers with real Google Maps link references and opening details.
              </p>
              <form onSubmit={handleMapsGrounding} className="flex gap-2">
                <input
                  id="maps-grounding-input"
                  type="text"
                  value={mapsPrompt}
                  onChange={(e) => setMapsPrompt(e.target.value)}
                  placeholder="e.g. Find 24/7 pharmacies and geriatric clinics nearby"
                  className="flex-1 bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
                />
                <button
                  id="maps-grounding-submit-btn"
                  type="submit"
                  disabled={!mapsPrompt.trim() || isMapsLoading}
                  className="bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5"
                >
                  {isMapsLoading ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
                  Find Places
                </button>
              </form>
            </div>

            {mapsResult && (
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="text-xs font-extrabold text-teal-800">Maps Grounded Results</span>
                  <span className="text-[10px] font-mono bg-teal-50 text-teal-800 px-2 py-0.5 rounded-full border border-teal-200">
                    {mapsResult.model}
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-stone-800 leading-relaxed whitespace-pre-wrap">
                  {mapsResult.text}
                </div>

                {mapsResult.places.length > 0 && (
                  <div className="border-t border-stone-100 pt-3">
                    <h4 className="text-xs font-black text-stone-700 mb-2 flex items-center gap-1.5">
                      <MapPin size={14} className="text-teal-700" />
                      Direct Google Maps Locations:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {mapsResult.places.map((place, idx) => (
                        <a
                          key={idx}
                          href={place.uri || `https://maps.google.com/?q=${encodeURIComponent(place.title)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-teal-50 border border-stone-200 hover:border-teal-300 transition text-xs text-teal-900 font-semibold"
                        >
                          <span className="truncate mr-2">{place.title}</span>
                          <ExternalLink size={13} className="shrink-0 text-teal-600" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Live Voice (Live API) */}
        {activeTab === "live" && (
          <div className="flex-1 flex flex-col p-4 overflow-y-auto bg-stone-50/50">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs mb-4 text-center">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-teal-100 text-teal-800 flex items-center justify-center mb-3">
                <Radio size={32} className={isLiveConnected ? "animate-pulse text-emerald-600" : ""} />
              </div>
              <h3 className="text-base font-black text-stone-900">Real-time Voice Conversation (Live API)</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto mt-1 mb-4">
                Full-duplex real-time audio interaction using <strong>gemini-3.1-flash-live-preview</strong> with ultra-low latency, natural interruption support, and comforting elderly voice tuning.
              </p>

              <div className="flex items-center justify-center gap-3">
                {!isLiveConnected ? (
                  <button
                    id="start-live-voice-btn"
                    onClick={startLiveSession}
                    className="bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs sm:text-sm px-6 py-3 rounded-2xl shadow-md transition flex items-center gap-2"
                  >
                    <Mic size={18} />
                    Start Live Voice Session
                  </button>
                ) : (
                  <button
                    id="stop-live-voice-btn"
                    onClick={stopLiveSession}
                    className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs sm:text-sm px-6 py-3 rounded-2xl shadow-md transition flex items-center gap-2"
                  >
                    <MicOff size={18} />
                    End Live Voice Session
                  </button>
                )}
              </div>
              <div className="mt-3 text-xs font-semibold text-stone-600">
                Status: <span className={isLiveConnected ? "text-emerald-700 font-black" : "text-stone-500"}>{liveStatus}</span>
              </div>
            </div>

            {/* Live Event Logs */}
            <div className="bg-stone-900 text-stone-100 p-4 rounded-2xl border border-stone-800 flex-1 overflow-y-auto font-mono text-xs space-y-1.5 min-h-[160px]">
              <div className="text-stone-400 border-b border-stone-800 pb-1 text-[11px]">
                Session Logs (Audio In: 16kHz PCM • Audio Out: 24kHz PCM)
              </div>
              {liveLogs.length === 0 ? (
                <div className="text-stone-500 italic">Click &quot;Start Live Voice Session&quot; to begin.</div>
              ) : (
                liveLogs.map((log, i) => (
                  <div key={i} className="text-stone-300">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Audio Transcribe */}
        {activeTab === "transcribe" && (
          <div className="flex-1 flex flex-col p-4 overflow-y-auto bg-stone-50/50">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs mb-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={18} className="text-teal-700" />
                <h3 className="text-sm font-black text-stone-900">Audio Transcription (gemini-3.5-transcribe)</h3>
              </div>
              <p className="text-xs text-stone-500 mb-4">
                Record elder patient speech or health statements and transcribe verbatim using <strong>gemini-3.5-transcribe</strong>, supporting Telugu, Hindi, Tamil, and English.
              </p>

              <div className="flex items-center gap-3">
                {!isRecordingTranscribe ? (
                  <button
                    id="start-transcribe-record-btn"
                    onClick={startTranscribeRecording}
                    className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2"
                  >
                    <Mic size={16} />
                    Record Patient Voice
                  </button>
                ) : (
                  <button
                    id="stop-transcribe-record-btn"
                    onClick={stopTranscribeRecording}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 animate-pulse"
                  >
                    <MicOff size={16} />
                    Stop & Transcribe
                  </button>
                )}
              </div>
            </div>

            {isTranscribeLoading && (
              <div className="bg-white p-6 rounded-2xl border border-stone-200 flex items-center justify-center gap-2 text-xs font-bold text-teal-800">
                <Loader2 size={20} className="animate-spin" />
                Transcribing audio with gemini-3.5-transcribe...
              </div>
            )}

            {transcribeResult && (
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
                <span className="text-xs font-extrabold text-teal-800">Transcription Result</span>
                <p className="text-xs sm:text-sm text-stone-800 bg-stone-50 p-4 rounded-xl border border-stone-200 whitespace-pre-wrap font-medium">
                  {transcribeResult}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
