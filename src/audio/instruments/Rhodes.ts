import { el } from "@elemaudio/core";
import { Midi } from "tonal";
import { v4 } from "uuid";
import Base from "./Base";
import {
  createEffectParamRef,
  registerEffectParameter,
  type ParameterSetter,
} from "../effectRefs";
import { readParamNumber } from "../parameterUtils";
import { createConstRef, createGateRef } from "../voiceRefs";

/** Per-voice gain so polyphonic sums stay below clipping before bus saturation. */
const VOICE_MIX_GAIN = 0.4;

class Rhodes extends Base {
  voices: any[];
  core: any;
  nextVoice = 0;

  private attackRef: ReturnType<typeof createEffectParamRef>;
  private decayRef: ReturnType<typeof createEffectParamRef>;
  private sustainRef: ReturnType<typeof createEffectParamRef>;
  private releaseRef: ReturnType<typeof createEffectParamRef>;
  private bellRef: ReturnType<typeof createEffectParamRef>;
  private bellRatioRef: ReturnType<typeof createEffectParamRef>;
  private filterCutoffRef: ReturnType<typeof createEffectParamRef>;
  private filterEnvRef: ReturnType<typeof createEffectParamRef>;
  private tremoloRateRef: ReturnType<typeof createEffectParamRef>;
  private tremoloDepthRef: ReturnType<typeof createEffectParamRef>;
  private driveRef: ReturnType<typeof createEffectParamRef>;

  constructor(
    id: string,
    core: any,
    parameters: Record<string, any> = {}
  ) {
    super(id);
    this.core = core;

    this.attackRef = createEffectParamRef(
      core,
      `${id}-attack`,
      readParamNumber(parameters, "attack", 0.002)
    );
    this.decayRef = createEffectParamRef(
      core,
      `${id}-decay`,
      readParamNumber(parameters, "decay", 1.4)
    );
    this.sustainRef = createEffectParamRef(
      core,
      `${id}-sustain`,
      readParamNumber(parameters, "sustain", 0.42)
    );
    this.releaseRef = createEffectParamRef(
      core,
      `${id}-release`,
      readParamNumber(parameters, "release", 0.9)
    );
    this.bellRef = createEffectParamRef(
      core,
      `${id}-bell`,
      readParamNumber(parameters, "bell", 65)
    );
    this.bellRatioRef = createEffectParamRef(
      core,
      `${id}-bellRatio`,
      readParamNumber(parameters, "bellRatio", 3.2)
    );
    this.filterCutoffRef = createEffectParamRef(
      core,
      `${id}-filterCutoff`,
      readParamNumber(parameters, "filterCutoff", 2800)
    );
    this.filterEnvRef = createEffectParamRef(
      core,
      `${id}-filterEnv`,
      readParamNumber(parameters, "filterEnv", 0.35)
    );
    this.tremoloRateRef = createEffectParamRef(
      core,
      `${id}-tremoloRate`,
      readParamNumber(parameters, "tremoloRate", 4.5)
    );
    this.tremoloDepthRef = createEffectParamRef(
      core,
      `${id}-tremoloDepth`,
      readParamNumber(parameters, "tremoloDepth", 0.18)
    );
    this.driveRef = createEffectParamRef(
      core,
      `${id}-drive`,
      readParamNumber(parameters, "drive", 1.15)
    );

    this.voices = Array.from({ length: 8 }, (_, index) => {
      const key = `rhodes-v${index + 1}-${v4()}`;
      const gate = createGateRef(core, key);
      const freq = createConstRef(core, `frequency-${key}`, 0);
      const velocity = createConstRef(core, `velocity-${key}`, 0);

      return {
        gate: 0.0,
        note: 0,
        velocity: 0,
        key,
        gateNode: gate.node,
        setGate: gate.setValue,
        freqNode: freq.node,
        setFreq: freq.setValue,
        velNode: velocity.node,
        setVelocity: velocity.setValue,
      };
    });
  }

  registerParameterSetters(
    setters: Map<string, ParameterSetter>,
    parameters: Record<string, any>
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
    registerEffectParameter(setters, parameters.bell, async (value) => {
      await this.bellRef.setValue({ value });
    });
    registerEffectParameter(setters, parameters.bellRatio, async (value) => {
      await this.bellRatioRef.setValue({ value });
    });
    registerEffectParameter(setters, parameters.filterCutoff, async (value) => {
      await this.filterCutoffRef.setValue({ value });
    });
    registerEffectParameter(setters, parameters.filterEnv, async (value) => {
      await this.filterEnvRef.setValue({ value });
    });
    registerEffectParameter(setters, parameters.tremoloRate, async (value) => {
      await this.tremoloRateRef.setValue({ value });
    });
    registerEffectParameter(setters, parameters.tremoloDepth, async (value) => {
      await this.tremoloDepthRef.setValue({ value });
    });
    registerEffectParameter(setters, parameters.drive, async (value) => {
      await this.driveRef.setValue({ value });
    });
  }

  voice = (voice: any) => {
    const ampEnv = el.adsr(
      { key: `rhodes-amp-${voice.key}` },
      this.attackRef.node,
      this.decayRef.node,
      this.sustainRef.node,
      this.releaseRef.node,
      voice.gateNode
    );

    const bellEnv = el.adsr(
      { key: `rhodes-bell-${voice.key}` },
      0.001,
      0.06,
      0.0,
      0.08,
      voice.gateNode
    );

    const filterEnv = el.adsr(
      { key: `rhodes-filter-${voice.key}` },
      0.008,
      0.5,
      0.15,
      0.45,
      voice.gateNode
    );

    const bellDepth = el.mul(
      this.bellRef.node,
      el.const({ key: `rhodes-bell-scale-${voice.key}`, value: 0.1 })
    );

    const modOsc = el.mul(
      bellEnv,
      el.mul(
        bellDepth,
        el.cycle(
          { key: `rhodes-mod-${voice.key}` },
          el.mul(voice.freqNode, this.bellRatioRef.node)
        )
      )
    );

    const fundamental = el.cycle(
      { key: `rhodes-fund-${voice.key}` },
      voice.freqNode
    );

    const tine = el.cycle(
      { key: `rhodes-carrier-${voice.key}` },
      el.add(voice.freqNode, modOsc)
    );

    const body = el.mul(
      el.const({ key: `rhodes-body-level-${voice.key}`, value: 0.38 }),
      el.cycle(
        { key: `rhodes-body-${voice.key}` },
        el.mul(
          voice.freqNode,
          el.const({ key: `rhodes-body-ratio-${voice.key}`, value: 2 })
        )
      )
    );

    const tone = el.add(
      el.mul(
        el.const({ key: `rhodes-fund-level-${voice.key}`, value: 0.62 }),
        fundamental
      ),
      el.mul(
        el.const({ key: `rhodes-tine-level-${voice.key}`, value: 0.28 }),
        tine
      ),
      body
    );

    const raw = el.mul(ampEnv, tone);

    const cutoff = el.add(
      this.filterCutoffRef.node,
      el.mul(filterEnv, el.mul(this.filterEnvRef.node, this.filterCutoffRef.node))
    );

    const filtered = el.lowpass(cutoff, 0.55, raw);

    const lfo = el.cycle({ key: `rhodes-lfo-${voice.key}` }, this.tremoloRateRef.node);
    const halfDepth = el.mul(
      el.const({ key: `rhodes-trem-half-${voice.key}`, value: 0.5 }),
      this.tremoloDepthRef.node
    );
    const trem = el.add(
      el.sub(
        el.const({ key: `rhodes-trem-one-${voice.key}`, value: 1 }),
        halfDepth
      ),
      el.mul(
        halfDepth,
        el.add(el.const({ key: `rhodes-trem-lfo-offset-${voice.key}`, value: 1 }), lfo)
      )
    );

    const driven = el.tanh(
      el.mul(filtered, trem, voice.velNode, this.driveRef.node)
    );
    return el.mul(
      el.const({ key: `rhodes-voice-mix-${voice.key}`, value: VOICE_MIX_GAIN }),
      driven
    );
  };

  private async activateVoice(
    voice: any,
    note: number,
    normalizedVelocity: number
  ) {
    const freq = Midi.midiToFreq(note);
    await voice.setFreq({ value: freq });
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
    const mixed = el.add(...this.voices.map((v) => this.voice(v)));
    return el.tanh(mixed);
  }
}

export default Rhodes;
