import { el, ElemNode } from "@elemaudio/core";
import * as ds from "../drumsynth";
import { v4 } from "uuid";
import Base from "./Base";
import { pulseGate } from "../triggerGate";
import { createConstRef, createGateRef } from "../voiceRefs";

type KickConfig = {
  type: "kick";
  pitch?: number;
  click?: number;
  attack?: number;
  decay?: number;
  drive?: number;
};

type ClapConfig = {
  type: "clap";
  tone?: number;
  attack?: number;
  decay?: number;
};

type HatConfig = {
  type: "hat";
  pitch?: number;
  tone?: number;
  attack?: number;
  decay?: number;
};

type DrumVoiceConfig = KickConfig | ClapConfig | HatConfig;

type Voice = DrumVoiceConfig & {
  gate: number;
  velocity: number;
  key: string;
  gateNode: ElemNode;
  setGate: (value: { value: number }) => Promise<void>;
  velNode: ElemNode;
  setVelocity: (value: { value: number }) => Promise<void>;
};

class DrumSynth extends Base {
  voices: Record<string, Voice>;

  constructor(id: string, config: Record<string, DrumVoiceConfig>, core: any) {
    super(id);
    this.voices = config as Record<string, Voice>;

    Object.values(this.voices).forEach((voice, index) => {
      voice.gate = 0;
      voice.velocity = 0;
      voice.key = `drumsynth-v${index}-${v4()}`;
      const gate = createGateRef(core, voice.key);
      const velocity = createConstRef(core, `velocity-${voice.key}`, 0);
      voice.gateNode = gate.node;
      voice.setGate = gate.setValue;
      voice.velNode = velocity.node;
      voice.setVelocity = velocity.setValue;
    });
  }

  voice = (voice: Voice) => {
    let signal: ElemNode;

    switch (voice.type) {
      case "kick":
        signal = ds.kick(
          voice.key,
          voice.pitch ?? 40,
          voice.click ?? 0.104,
          voice.attack ?? 0.005,
          voice.decay ?? 0.4,
          voice.drive ?? 4,
          voice.gateNode
        );
        break;
      case "clap":
        signal = ds.clap(
          voice.key,
          voice.tone ?? 800,
          voice.attack ?? 0.005,
          voice.decay ?? 0.204,
          voice.gateNode
        );
        break;
      case "hat":
        signal = ds.hat(
          voice.key,
          voice.pitch ?? 317,
          voice.tone ?? 12000,
          voice.attack ?? 0.005,
          voice.decay ?? 0.1,
          voice.gateNode
        );
        break;
    }

    return el.mul(signal, voice.velNode);
  };

  noteOn(note: number, velocity: number) {
    void this.handleNoteOn(note, velocity);
  }

  async handleNoteOn(note: number, velocity: number) {
    const entry = Object.entries(this.voices).find(
      ([key]) => Number(key) === note
    );
    if (!entry) return;

    const pad = entry[1];
    await pad.setVelocity({ value: velocity / 127 });
    await pulseGate(pad);
  }

  noteOff(_note: number, _velocity: number = 0) {}

  render() {
    return el.add(...Object.values(this.voices).map((voice) => this.voice(voice)));
  }
}

export default DrumSynth;
