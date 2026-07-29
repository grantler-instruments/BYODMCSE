import { el } from "@elemaudio/core";
import { v4 } from "uuid";
import Base from "./Base";
import { createGateRef } from "../voiceRefs";
class Noise extends Base {
  key: string;
  gate = 0;
  gateNode: ReturnType<typeof createGateRef>["node"];
  setGate: ReturnType<typeof createGateRef>["setValue"];

  constructor(id: string, core: any) {
    super(id);
    this.key = `noise-v1-${v4()}`;
    const gate = createGateRef(core, this.key);
    this.gateNode = gate.node;
    this.setGate = gate.setValue;
  }

  noteOn(_note: number, _velocity: number) {
    void this.handleNoteOn();
  }

  async handleNoteOn() {
    await this.setGate({ value: 1.0 });
    this.gate = 1.0;
  }

  noteOff(_note: number, _velocity = 0) {
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
