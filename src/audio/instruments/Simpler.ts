import { el } from "@elemaudio/core";
import { v4 } from "uuid";
import Base from "./Base";
import { createConstRef, createGateRef } from "../voiceRefs";

class Simpler extends Base {
  sample: any;
  voices: any[];
  nextVoice: number;

  constructor(id: string, config: any, core: any) {
    super(id);
    const { sample } = config;
    this.sample = sample;

    this.voices = Array.from({ length: 10 }, (_, index) => {
      const key = `simpler-v${index + 1}-${v4()}`;
      const gate = createGateRef(core, key);
      const pitch = createConstRef(core, `pitch-${key}`, 1);
      const velocity = createConstRef(core, `velocity-${key}`, 0);

      return {
        gate: 0.0,
        note: 0,
        velocity: 0,
        key,
        gateNode: gate.node,
        setGate: gate.setValue,
        pitchNode: pitch.node,
        setPitch: pitch.setValue,
        velNode: velocity.node,
        setVelocity: velocity.setValue,
      };
    });
    this.nextVoice = 0;
  }

  voice = (voice: any) => {
    const env = el.adsr(
      { key: `env-${voice.key}` },
      0.01,
      0.1,
      0.7,
      0.2,
      voice.gateNode
    );
    const sample = el.sample(
      { path: this.sample.path, key: `sample-${voice.key}`, mode: "gate" },
      voice.gateNode,
      voice.pitchNode
    );
    return el.mul(sample, env, voice.velNode);
  };

  private async activateVoice(
    voice: any,
    note: number,
    normalizedVelocity: number
  ) {
    await voice.setPitch({ value: Math.pow(2, (note - 69) / 12) });
    await voice.setVelocity({ value: normalizedVelocity });
    voice.note = note;
    voice.velocity = normalizedVelocity;
  }

  private async openGate(voice: any, retrigger: boolean) {
    if (retrigger) {
      await voice.setGate({ value: 0.0 });
      voice.gate = 0.0;
    }
    await voice.setGate({ value: 1.0 });
    voice.gate = 1.0;
  }

  noteOn(note: number, velocity: number) {
    void this.handleNoteOn(note, velocity);
  }

  private async handleNoteOn(note: number, velocity: number) {
    const normalizedVelocity = velocity / 127;
    const voiceIndex = this.voices.findIndex((v) => v.note == note);
    let voice: any;
    let retrigger = false;

    if (voiceIndex >= 0) {
      voice = this.voices[voiceIndex];
      retrigger = voice.gate === 1.0;
    } else {
      voice = this.voices[this.nextVoice];
      retrigger = voice.gate === 1.0;
    }

    this.nextVoice++;
    this.nextVoice = this.nextVoice % this.voices.length;

    if (retrigger) {
      this.releaseVoice(voice);
    }

    await this.activateVoice(voice, note, normalizedVelocity);
    await this.openGate(voice, retrigger);
  }

  noteOff(note: number, velocity: number = 0) {
    void this.handleNoteOff(note);
  }

  private async handleNoteOff(note: number) {
    const voice = this.findVoiceForNote(this.voices, note);
    if (!voice) return;

    this.releaseVoice(voice);
    await voice.setGate({ value: 0.0 });
  }

  render() {
    const out = el.add(...this.voices.map((v) => this.voice(v)));
    return out;
  }
}

export default Simpler;
