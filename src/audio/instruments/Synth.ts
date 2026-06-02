import { el } from "@elemaudio/core";
import { Midi } from "tonal";
import { v4 } from "uuid";
import Base from "./Base";
import {
  createEffectParamRef,
  registerEffectParameter,
  type ParameterSetter,
} from "../effectRefs";
import { readParamNumber, readParamString } from "../parameterUtils";
import { createConstRef, createGateRef } from "../voiceRefs";

type Waveform = "sine" | "saw" | "square" | "triangle";

class Synth extends Base {
  voices: any[];
  core: any;
  nextVoice = 0;

  private attackRef: ReturnType<typeof createEffectParamRef>;
  private decayRef: ReturnType<typeof createEffectParamRef>;
  private sustainRef: ReturnType<typeof createEffectParamRef>;
  private releaseRef: ReturnType<typeof createEffectParamRef>;
  private amplitudeARef: ReturnType<typeof createEffectParamRef>;
  private amplitudeBRef: ReturnType<typeof createEffectParamRef>;
  private amplitudeCRef: ReturnType<typeof createEffectParamRef>;

  private detuneA: number;
  private detuneB: number;
  private detuneC: number;
  private waveformA: Waveform;
  private waveformB: Waveform;
  private waveformC: Waveform;

  constructor(
    id: string,
    core: any,
    parameters: Record<string, any> = {}
  ) {
    super(id);
    this.core = core;

    this.detuneA = readParamNumber(parameters, "detuneA", 2);
    this.detuneB = readParamNumber(parameters, "detuneB", 4);
    this.detuneC = readParamNumber(parameters, "detuneC", 2.3);
    this.waveformA = readParamString(parameters, "waveformA", "sine") as Waveform;
    this.waveformB = readParamString(parameters, "waveformB", "sine") as Waveform;
    this.waveformC = readParamString(parameters, "waveformC", "sine") as Waveform;

    this.attackRef = createEffectParamRef(
      core,
      `${id}-attack`,
      readParamNumber(parameters, "attack", 0.1)
    );
    this.decayRef = createEffectParamRef(
      core,
      `${id}-decay`,
      readParamNumber(parameters, "decay", 1)
    );
    this.sustainRef = createEffectParamRef(
      core,
      `${id}-sustain`,
      readParamNumber(parameters, "sustain", 1)
    );
    this.releaseRef = createEffectParamRef(
      core,
      `${id}-release`,
      readParamNumber(parameters, "release", 4)
    );
    this.amplitudeARef = createEffectParamRef(
      core,
      `${id}-amplitudeA`,
      readParamNumber(parameters, "amplitudeA", 0.4)
    );
    this.amplitudeBRef = createEffectParamRef(
      core,
      `${id}-amplitudeB`,
      readParamNumber(parameters, "amplitudeB", 0.2)
    );
    this.amplitudeCRef = createEffectParamRef(
      core,
      `${id}-amplitudeC`,
      readParamNumber(parameters, "amplitudeC", 0.1)
    );

    this.voices = Array.from({ length: 10 }, (_, index) => {
      const key = `synth-v${index + 1}-${v4()}`;
      const gate = createGateRef(core, key);
      const freqA = createConstRef(core, `frequencyA-${key}`, 0);
      const freqB = createConstRef(core, `frequencyB-${key}`, 0);
      const freqC = createConstRef(core, `frequencyC-${key}`, 0);
      const velocity = createConstRef(core, `velocity-${key}`, 0);

      return {
        gate: 0.0,
        note: 0,
        velocity: 0,
        key,
        gateNode: gate.node,
        setGate: gate.setValue,
        freqNodeA: freqA.node,
        setFreqA: freqA.setValue,
        freqNodeB: freqB.node,
        setFreqB: freqB.setValue,
        freqNodeC: freqC.node,
        setFreqC: freqC.setValue,
        velNode: velocity.node,
        setVelocity: velocity.setValue,
      };
    });
  }

  registerParameterSetters(
    setters: Map<string, ParameterSetter>,
    parameters: Record<string, any>,
    requestRender?: () => void
  ) {
    registerEffectParameter(setters, parameters.attack, async (value) => {
      await this.attackRef.setValue({ value });
    });
    registerEffectParameter(setters, parameters.decay, async (value) => {
      await this.decayRef.setValue({ value });
    });
    registerEffectParameter(setters, parameters.sustain, async (value) => {
      await this.sustainRef.setValue({ value });
    });
    registerEffectParameter(setters, parameters.release, async (value) => {
      await this.releaseRef.setValue({ value });
    });
    registerEffectParameter(setters, parameters.amplitudeA, async (value) => {
      await this.amplitudeARef.setValue({ value });
    });
    registerEffectParameter(setters, parameters.amplitudeB, async (value) => {
      await this.amplitudeBRef.setValue({ value });
    });
    registerEffectParameter(setters, parameters.amplitudeC, async (value) => {
      await this.amplitudeCRef.setValue({ value });
    });
    registerEffectParameter(setters, parameters.detuneA, (value) => {
      this.detuneA = value;
    });
    registerEffectParameter(setters, parameters.detuneB, (value) => {
      this.detuneB = value;
    });
    registerEffectParameter(setters, parameters.detuneC, (value) => {
      this.detuneC = value;
    });
    registerEffectParameter(setters, parameters.waveformA, (value) => {
      this.waveformA = value as Waveform;
      requestRender?.();
    });
    registerEffectParameter(setters, parameters.waveformB, (value) => {
      this.waveformB = value as Waveform;
      requestRender?.();
    });
    registerEffectParameter(setters, parameters.waveformC, (value) => {
      this.waveformC = value as Waveform;
      requestRender?.();
    });
  }

  getWaveform = (waveform: Waveform, frequency: any, key: string) => {
    switch (waveform) {
      case "sine":
        return el.cycle({ key }, frequency);
      case "saw":
        return el.saw({ key }, frequency);
      case "square":
        return el.square({ key }, frequency);
      case "triangle":
        return el.triangle({ key }, frequency);
      default:
        return el.cycle({ key }, frequency);
    }
  };

  voice = (voice: any) => {
    const env = el.adsr(
      { key: `env-${voice.key}` },
      this.attackRef.node,
      this.decayRef.node,
      this.sustainRef.node,
      this.releaseRef.node,
      voice.gateNode
    );

    const oscA = el.mul(
      this.amplitudeARef.node,
      this.getWaveform(this.waveformA, voice.freqNodeA, `oscA-${voice.key}`)
    );

    const oscB = el.mul(
      this.amplitudeBRef.node,
      this.getWaveform(this.waveformB, voice.freqNodeB, `oscB-${voice.key}`)
    );

    const oscC = el.mul(
      this.amplitudeCRef.node,
      this.getWaveform(this.waveformC, voice.freqNodeC, `oscC-${voice.key}`)
    );

    const signal = el.add(oscA, oscB, oscC);
    return el.mul(env, signal, voice.velNode);
  };

  private async activateVoice(
    voice: any,
    note: number,
    normalizedVelocity: number
  ) {
    const freq = Midi.midiToFreq(note);

    await voice.setFreqA({ value: freq * this.detuneA });
    await voice.setFreqB({ value: freq * this.detuneB });
    await voice.setFreqC({ value: freq * this.detuneC });
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
    const voiceIndex = this.voices.findIndex((v) => v.note === note);
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

  noteOff(note: number, _velocity: number = 0) {
    void this.handleNoteOff(note);
  }

  private async handleNoteOff(note: number) {
    const voice = this.findVoiceForNote(this.voices, note);
    if (!voice) return;

    this.releaseVoice(voice);
    await voice.setGate({ value: 0.0 });
  }

  render() {
    return el.add(...this.voices.map((v) => this.voice(v)));
  }
}

export default Synth;
