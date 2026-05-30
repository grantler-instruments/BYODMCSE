import { el } from "@elemaudio/core";
import { v4 } from "uuid";
import Base from "./Base";
import { createGateRef } from "../voiceRefs";

class Noise extends Base {
  constructor(id, core) {
    super(id);
    this.key = `noise-v1-${v4()}`;
    const gate = createGateRef(core, this.key);
    this.gate = 0;
    this.gateNode = gate.node;
    this.setGate = gate.setValue;
  }

  noteOn(note, velocity) {
    void this.handleNoteOn();
  }

  async handleNoteOn() {
    await this.setGate({ value: 1.0 });
    this.gate = 1.0;
  }

  noteOff(note, velocity = 0) {
    void this.handleNoteOff();
  }

  async handleNoteOff() {
    await this.setGate({ value: 0.0 });
    this.gate = 0.0;
  }

  render() {
    return el.mul(this.gateNode, el.noise({ key: `noise-${this.key}` }));
  }
}

export default Noise;
