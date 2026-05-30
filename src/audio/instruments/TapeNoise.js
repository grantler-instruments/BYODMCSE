import { el } from "@elemaudio/core";
import { v4 } from "uuid";
import Base from "./Base";
import { createGateRef } from "../voiceRefs";
// https://twitter.com/ubcomposer/status/1647659387396169728?s=46&t=Z3VnznKKxadB7DXpOQN7dg

class TapeNoise extends Base {
  constructor(id, core) {
    super(id);
    const key = `tape_noise-v1-${v4()}`;
    const gate = createGateRef(core, key);
    this.modulation = {
      valueTrain: 0.01,
      noiseAmountRate: Math.random() * 1000,
      noiseSignalRate: Math.random() * 10,
      allpassRate: 2,
    };
    this.voices = [
      {
        gate: 0.0,
        note: 0,
        velocity: 0,
        key,
        gateNode: gate.node,
        setGate: gate.setValue,
      },
    ];
  }

  voice = (voice) => {
    const { key } = voice;
    const { valueTrain, noiseAmountRate, noiseSignalRate, allpassRate } =
      this.modulation;

    const env = el.adsr(
      { key: `env-${key}` },
      1.0,
      1.0,
      1.0,
      2.0,
      voice.gateNode
    );

    const value = el.latch(
      el.train(el.const({ key: `${key}-value-train`, value: valueTrain })),
      el.noise({ key: `${key}-value-noise` })
    );

    const noiseAmount = el.mul(
      100,
      el.latch(
        el.train(
          el.const({ key: `${key}-amount-train`, value: noiseAmountRate })
        ),
        el.abs(el.noise({ key: `${key}-amount-noise` }))
      )
    );

    const noiseSignal = el.mul(
      el.cycle(el.cycle(value)),
      el.latch(
        el.train(
          el.const({ key: `${key}-signal-train`, value: noiseSignalRate })
        ),
        el.noise({ key: `${key}-signal-noise` })
      )
    );

    return el.mul(
      0.4,
      env,
      el.allpass(
        el.mul(
          1000,
          el.latch(
            el.train(el.const({ key: `${key}-allpass-train`, value: allpassRate })),
            el.abs(el.noise({ key: `${key}-allpass-noise` }))
          )
        ),
        noiseAmount,
        noiseSignal
      )
    );
  };

  noteOn(note, velocity) {
    void this.handleNoteOn(note, velocity);
  }

  async handleNoteOn(note, velocity) {
    const voice = this.voices[0];
    voice.note = note;
    voice.velocity = velocity;
    await voice.setGate({ value: 1.0 });
    voice.gate = 1.0;
  }

  noteOff(note, velocity = 0) {
    void this.handleNoteOff();
  }

  async handleNoteOff() {
    const voice = this.voices[0];
    voice.velocity = 0;
    await voice.setGate({ value: 0.0 });
    voice.gate = 0.0;
  }

  render() {
    const out = el.add(...this.voices.map((v) => this.voice(v)));
    return out;
  }
}

export default TapeNoise;
