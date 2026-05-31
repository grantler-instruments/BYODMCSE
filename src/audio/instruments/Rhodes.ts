import { el } from "@elemaudio/core";
import { Midi } from "tonal";
import { v4 } from "uuid";
import Base from "./Base";
import useLiveSetStore from "../../store/liveSet";
import { createConstRef, createGateRef } from "../voiceRefs";

class Rhodes extends Base {
  voices: any[];
  core: any;
  nextVoice = 0;

  constructor(id: string, core: any) {
    super(id);
    this.core = core;
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

  voice = (voice: any) => {
    const getParameterValue = useLiveSetStore.getState().getParameterValue;
    const attack = getParameterValue(this.id, "attack");
    const decay = getParameterValue(this.id, "decay");
    const sustain = getParameterValue(this.id, "sustain");
    const release = getParameterValue(this.id, "release");
    const bell = getParameterValue(this.id, "bell");
    const bellRatio = getParameterValue(this.id, "bellRatio");
    const filterCutoff = getParameterValue(this.id, "filterCutoff");
    const filterEnvAmt = getParameterValue(this.id, "filterEnv");
    const tremoloRate = getParameterValue(this.id, "tremoloRate");
    const tremoloDepth = getParameterValue(this.id, "tremoloDepth");
    const drive = getParameterValue(this.id, "drive");

    const ampEnv = el.adsr(
      { key: `rhodes-amp-${voice.key}` },
      attack,
      decay,
      sustain,
      release,
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

    const bellDepth = bell * 0.1;

    const modOsc = el.mul(
      bellEnv,
      el.mul(
        el.const({ key: `rhodes-bell-depth-${voice.key}`, value: bellDepth }),
        el.cycle(
          { key: `rhodes-mod-${voice.key}` },
          el.mul(
            voice.freqNode,
            el.const({ key: `rhodes-bell-ratio-${voice.key}`, value: bellRatio })
          )
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
        el.mul(voice.freqNode, el.const({ key: `rhodes-body-ratio-${voice.key}`, value: 2 }))
      )
    );

    const tone = el.add(
      el.mul(el.const({ key: `rhodes-fund-level-${voice.key}`, value: 0.62 }), fundamental),
      el.mul(el.const({ key: `rhodes-tine-level-${voice.key}`, value: 0.28 }), tine),
      body
    );

    const raw = el.mul(ampEnv, tone);

    const cutoff = el.add(
      el.const({ key: `rhodes-cutoff-base-${voice.key}`, value: filterCutoff }),
      el.mul(
        filterEnv,
        el.const({
          key: `rhodes-cutoff-env-${voice.key}`,
          value: filterEnvAmt * filterCutoff,
        })
      )
    );

    const filtered = el.lowpass(cutoff, 0.55, raw);

    const lfo = el.cycle({ key: `rhodes-lfo-${voice.key}` }, tremoloRate);
    const trem = el.add(
      el.const({ key: `rhodes-trem-base-${voice.key}`, value: 1 - tremoloDepth / 2 }),
      el.mul(
        el.const({ key: `rhodes-trem-depth-${voice.key}`, value: tremoloDepth / 2 }),
        el.add(1, lfo)
      )
    );

    return el.tanh(
      el.mul(
        filtered,
        trem,
        voice.velNode,
        el.const({ key: `rhodes-drive-${voice.key}`, value: drive })
      )
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
    return el.add(...this.voices.map((v) => this.voice(v)));
  }
}

export default Rhodes;
