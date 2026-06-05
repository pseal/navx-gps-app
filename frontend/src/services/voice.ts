// src/services/voice.ts
// Web Speech API — works through phone/laptop speaker, no hardware pairing needed

class VoiceService {
  private synth: SpeechSynthesis | null = null;
  private enabled: boolean = true;
  private lastSpoken: string = '';

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  get isSupported(): boolean { return this.synth !== null; }
  get isEnabled(): boolean  { return this.enabled; }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (!this.enabled) this.synth?.cancel();
    return this.enabled;
  }

  speak(text: string, force = false): void {
    if (!this.synth || !this.enabled) return;
    if (!force && text === this.lastSpoken) return; // avoid repeating same instruction
    this.synth.cancel(); // stop any current speech
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate  = 0.95;
    utt.pitch = 1.0;
    utt.volume = 1.0;
    // prefer a natural-sounding voice
    const voices = this.synth.getVoices();
    const preferred = voices.find(v =>
      v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))
    ) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utt.voice = preferred;
    this.lastSpoken = text;
    this.synth.speak(utt);
  }

  announceStep(instruction: string, distanceMeters: number): void {
    const dist = distanceMeters >= 1000
      ? `In ${(distanceMeters / 1000).toFixed(1)} kilometres, `
      : distanceMeters > 50
        ? `In ${Math.round(distanceMeters)} metres, `
        : '';
    this.speak(`${dist}${instruction}`);
  }

  announceRouteStart(summary: string): void {
    this.speak(`Starting navigation. Route is ${summary}`, true);
  }

  announceArrival(): void {
    this.speak('You have arrived at your destination.', true);
  }

  cancel(): void { this.synth?.cancel(); }
}

export const voice = new VoiceService();
