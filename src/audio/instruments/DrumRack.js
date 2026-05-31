import { el } from "@elemaudio/core";
import { v4 } from "uuid";
import Base from "./Base";
import { pulseGate } from "../triggerGate";
import { createConstRef, createGateRef } from "../voiceRefs";

class DrumRack extends Base {
  constructor(id, samples, core) {
    super(id);
    this.id = id;
    this.voices = samples;

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

  voice = (voice) => {
    const out = el.sample(
      { path: voice.path, key: `sample-${voice.key}`, mode: "trigger" },
      voice.gateNode,
      1.0
    );
    return el.mul(out, voice.velNode);
  };

  noteOn(note, velocity) {
    void this.handleNoteOn(note, velocity);
  }

  async handleNoteOn(note, velocity) {
    const entry = Object.entries(this.voices).find(([key]) => key == note);
    if (!entry) return;

    const pad = entry[1];
    pad.timestamp = new Date();
    pad.velocity = velocity / 127;

    await pad.setVelocity({ value: pad.velocity });
    await pulseGate(pad);
  }

  noteOff(note) {}

  render() {
    const voices = Object.values(this.voices);
    const out = el.add(...voices.map((voice) => this.voice(voice)));
    return out;
  }
}

export default DrumRack;
