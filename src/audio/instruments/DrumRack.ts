import { el, ElemNode } from "@elemaudio/core";
import { v4 } from "uuid";
import Base from "./Base";
import { pulseGate } from "../triggerGate";
import { createConstRef, createGateRef } from "../voiceRefs";

type DrumRackSampleInput = { path: string };

type DrumRackVoice = DrumRackSampleInput & {
  gate: number;
  velocity: number;
  timestamp?: Date;
  key: string;
  gateNode: ElemNode;
  setGate: (value: { value: number }) => Promise<void>;
  velNode: ElemNode;
  setVelocity: (value: { value: number }) => Promise<void>;
};

class DrumRack extends Base {
  voices: Record<string, DrumRackVoice>;

  constructor(
    id: string,
    samples: Record<string, DrumRackSampleInput>,
    core: any
  ) {
    super(id);
    this.voices = samples as Record<string, DrumRackVoice>;

    Object.values(this.voices).forEach((voice, index) => {
      voice.gate = 0;
      voice.velocity = 0;
      voice.key = `drumrack-v${index}-${v4()}`;
      const gate = createGateRef(core, voice.key);
      const velocity = createConstRef(core, `velocity-${voice.key}`, 0);
      voice.gateNode = gate.node;
      voice.setGate = gate.setValue;
      voice.velNode = velocity.node;
      voice.setVelocity = velocity.setValue;
    });
  }

  voice = (voice: DrumRackVoice) => {
    const out = el.sample(
      { path: voice.path, key: `sample-${voice.key}`, mode: "trigger" },
      voice.gateNode,
      1.0
    );
    return el.mul(out, voice.velNode);
  };

  noteOn(note: number, velocity: number) {
    void this.handleNoteOn(note, velocity);
  }

  async handleNoteOn(note: number, velocity: number) {
    const entry = Object.entries(this.voices).find(([key]) => key == String(note));
    if (!entry) return;

    const pad = entry[1];
    pad.timestamp = new Date();
    pad.velocity = velocity / 127;

    await pad.setVelocity({ value: pad.velocity });
    await pulseGate(pad);
  }

  noteOff(_note: number, _velocity = 0) {}

  render() {
    const voices = Object.values(this.voices);
    return el.add(...voices.map((voice) => this.voice(voice)));
  }
}

export default DrumRack;
