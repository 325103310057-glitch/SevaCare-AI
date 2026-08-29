// Audio feedback synthesizer using Web Audio API (zero external sound files required)
class SoundManager {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Gentle morning reminder chime (pleasant melodic chord)
  playReminderChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + i * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.9);
    });
  }

  // Follow-up reminder chime (attention bell)
  playAttentionChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [440, 554.37, 659.25]; // A4, C#5, E5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + i * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.8);
    });
  }

  // Success confirmation tone (happy double beep)
  playSuccessChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    const freqs = [587.33, 880]; // D5, A5
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.14);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + i * 0.14 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.14 + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.14);
      osc.stop(ctx.currentTime + i * 0.14 + 0.6);
    });
  }

  // Urgent / SOS Siren for Caregiver and Patient
  playEmergencyAlarm() {
    const ctx = this.getContext();
    if (!ctx) return;

    for (let loop = 0; loop < 3; loop++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";

      const startTime = ctx.currentTime + loop * 0.5;
      osc.frequency.setValueAtTime(600, startTime);
      osc.frequency.linearRampToValueAtTime(950, startTime + 0.25);
      osc.frequency.linearRampToValueAtTime(600, startTime + 0.5);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.35, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.5);
    }
  }

  // Voice recording start click
  playMicClick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  // Soft tactile click for UI buttons
  playTap() {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }
}

export const soundFx = new SoundManager();

// Text-to-Speech Controller with language voice matching & volume control
export function speakText(
  text: string,
  languageCode: string = "en-US",
  volume: number = 1.0,
  rate: number = 0.9,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      console.warn("Speech synthesis not supported in this browser");
      onEnd?.();
      resolve();
      return;
    }

    window.speechSynthesis.cancel(); // Stop any currently playing audio

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageCode;
    utterance.volume = Math.max(0.1, Math.min(1.0, volume));
    utterance.rate = Math.max(0.7, Math.min(1.2, rate)); // Slightly slower for elderly clarity
    utterance.pitch = 1.0;

    // Pick best matching native voice if available
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = languageCode.split("-")[0];
    const matchingVoice = voices.find(
      (v) => v.lang === languageCode || v.lang.startsWith(langPrefix)
    );
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onstart = () => {
      onStart?.();
    };

    utterance.onend = () => {
      onEnd?.();
      resolve();
    };

    utterance.onerror = (e) => {
      console.warn("TTS Error:", e);
      onEnd?.();
      resolve();
    };

    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

// Browser Speech Recognition interface
export interface VoiceRecognitionProps {
  languageCode?: string;
  onResult: (transcript: string) => void;
  onError?: (err: string) => void;
  onStateChange?: (listening: boolean) => void;
}

export function createSpeechRecognizer({
  languageCode = "en-US",
  onResult,
  onError,
  onStateChange,
}: VoiceRecognitionProps) {
  if (typeof window === "undefined") return null;

  const SpeechRecognition =
    (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = languageCode;
  recognition.maxAlternatives = 1;

  let finalTranscript = "";

  recognition.onstart = () => {
    finalTranscript = "";
    onStateChange?.(true);
  };

  recognition.onresult = (event: any) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interim += event.results[i][0].transcript;
      }
    }
    const current = (finalTranscript || interim).trim();
    if (current) {
      onResult(current);
    }
  };

  recognition.onerror = (event: any) => {
    console.warn("Speech recognition error:", event.error);
    onError?.(event.error);
    onStateChange?.(false);
  };

  recognition.onend = () => {
    onStateChange?.(false);
  };

  return recognition;
}
