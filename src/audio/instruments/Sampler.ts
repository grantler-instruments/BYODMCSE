import { el } from "@elemaudio/core";
import { v4 } from "uuid";
import Base from "./Base";


class Sampler extends Base {
  samples: any[];
  voices: any[];
  nextVoice: number;

  constructor(id: string, config: any) {
    super(id);
    const { samples } = config;
    this.samples = samples;

    this.voices = Array.from({ length: 10 }, () => ({
      gate: 0.0,
      note: 0,
      velocity: 0,
      key: `sampler-voice-${v4()}`,
    }));

    this.nextVoice = 0;
  }

  voice = (voice: any) => {
    const gate = el.const({
      key: `gate-${voice.key}`,
      value: voice.gate,
    });
    const pitch = el.const({
      key: `pitch-${voice.key}`,
      value: Math.pow(2, (voice.note - 69) / 12),
    });

    // Find the correct sample based on the note
    const sampleConfig = this.samples.find(
      (s: any) => voice.note >= s.minNote && voice.note <= s.maxNote
    ) || this.samples[0]; // Default to the first sample if not found

    const env = el.adsr(0.01, 0.1, 0.7, 0.2, gate);
    const sample = el.sample({ path: sampleConfig.path, mode: "gate" }, gate, pitch);
    const out = el.mul(sample, env, voice.velocity);
    return out;
  };

  noteOn(note: number, velocity: number) {
    const voiceIndex = this.voices.findIndex((v) => v.note == note);
    if (voiceIndex >= 0) {
      this.voices[voiceIndex].gate = 1.0;
      this.voices[voiceIndex].note = note;
      this.voices[voiceIndex].velocity = velocity / 127;
    } else {
      this.voices[this.nextVoice].gate = 1.0;
      this.voices[this.nextVoice].note = note;
      this.voices[this.nextVoice].velocity = velocity / 127;
    }

    this.nextVoice++;
    this.nextVoice = this.nextVoice % this.voices.length;
  }

  noteOff(note: number, velocity: number = 0) {
    const voice = this.findVoiceForNote(this.voices, note);
    if (voice) {
      this.releaseVoice(voice);
    }
  }

  render() {
    const out = el.add(...this.voices.map((v) => this.voice(v)));
    return out;
  }
}

export default Sampler;
