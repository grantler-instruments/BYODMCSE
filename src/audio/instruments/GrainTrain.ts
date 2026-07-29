import { el } from "@elemaudio/core";
import { v4 } from "uuid";
import Base from "./Base";

// https://github.com/zya/granular/blob/gh-pages/js/main.js

type GrainVoice = {
  gate: number;
  note: number;
  velocity: number;
  key: string;
};

class GrainTrain extends Base {
  voices: GrainVoice[];

  constructor(id: string) {
    super(id);
    this.voices = [
      { gate: 0.0, note: 0, velocity: 0, key: `grainTrain-v1-${v4()}` },
    ];
  }

  voice = (voice: GrainVoice) => {
    const { key } = voice;
    const t = el.phasor({ key: `${key}-t` }, 1);
    const t2 = el.sub(el.add(t, 0.5), el.floor(el.add(t, 0.5)));

    const o = el.mod(
      el.add(
        el.phasor({ key: `${key}-o-phasor` }, 0.01),
        el.latch(el.train(4), el.rand())
      ),
      1
    );
    const r = el.add(o, el.mul(0.001, t));
    const r2 = el.add(o, el.mul(0.001, t2));

    return el.lowpass(
      el.add(1200, el.mul(800, el.cycle(0.1))),
      0.717,
      el.add(
        el.mul(el.hann(t), el.table({ path: "/samples/number_1.wav" }, r)),
        el.mul(el.hann(t2), el.table({ path: "/samples/number_1.wav" }, r2))
      )
    );
  };

  noteOn(note: number, velocity: number) {
    this.voices[0].gate = 1.0;
    this.voices[0].note = note;
    this.voices[0].velocity = velocity;
  }

  noteOff(note: number, _velocity = 0) {
    this.voices[0].gate = 0;
    this.voices[0].note = note;
    this.voices[0].velocity = 0;
  }

  render() {
    return el.add(...this.voices.map((v) => this.voice(v)));
  }
}

export default GrainTrain;
