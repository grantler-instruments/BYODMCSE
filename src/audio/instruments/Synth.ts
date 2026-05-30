import { el } from "@elemaudio/core";
import { Midi } from "tonal";
import { v4 } from "uuid";
import Base from "./Base";
import useLiveSetStore from "../../store/liveSet";
import { createConstRef, createGateRef } from "../voiceRefs";

// https://www.youtube.com/watch?v=0voWrxLDnSE

class Synth extends Base {
  voices: any[];
  core: any;
  nextVoice = 0;

  constructor(id: string, core: any) {
    super(id);
    this.core = core;
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

  getWaveform = (waveform: string, frequency: any, key: string) => {
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
    const getParameterValue = useLiveSetStore.getState().getParameterValue;
    const attack = getParameterValue(this.id, "attack");
    const decay = getParameterValue(this.id, "decay");
    const sustain = getParameterValue(this.id, "sustain");
    const release = getParameterValue(this.id, "release");
    const env = el.adsr(
      { key: `env-${voice.key}` },
      el.const({ key: `${this.id}-attack`, value: attack }),
      el.const({ key: `${this.id}-decay`, value: decay }),
      el.const({ key: `${this.id}-sustain`, value: sustain }),
      el.const({ key: `${this.id}-release`, value: release }),
      voice.gateNode
    );

    const amplitudeA: number = getParameterValue(this.id, "amplitudeA");

    const oscA = el.mul(
      el.const({
        key: `amplitudeA-${voice.key}`,
        value: amplitudeA,
      }),
      this.getWaveform(
        getParameterValue(this.id, "waveformA"),
        voice.freqNodeA,
        `oscA-${voice.key}`
      )
    );

    const amplitudeB = getParameterValue(this.id, "amplitudeB");
    const oscB = el.mul(
      el.const({
        key: `amplitudeB-${voice.key}`,
        value: amplitudeB,
      }),
      this.getWaveform(
        getParameterValue(this.id, "waveformB"),
        voice.freqNodeB,
        `oscB-${voice.key}`
      )
    );

    const amplitudeC = getParameterValue(this.id, "amplitudeC");
    const oscC = el.mul(
      el.const({
        key: `amplitudeC-${voice.key}`,
        value: amplitudeC,
      }),
      this.getWaveform(
        getParameterValue(this.id, "waveformC"),
        voice.freqNodeC,
        `oscC-${voice.key}`
      )
    );

    const signal = el.add(oscA, oscB, oscC);
    return el.mul(env, signal, voice.velNode);
  };

  private async activateVoice(
    voice: any,
    note: number,
    normalizedVelocity: number
  ) {
    const getParameterValue = useLiveSetStore.getState().getParameterValue;
    const freq = Midi.midiToFreq(note);

    await voice.setFreqA({ value: freq * getParameterValue(this.id, "detuneA") });
    await voice.setFreqB({ value: freq * getParameterValue(this.id, "detuneB") });
    await voice.setFreqC({ value: freq * getParameterValue(this.id, "detuneC") });
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

export default Synth;
