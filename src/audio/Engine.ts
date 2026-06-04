import { el } from "@elemaudio/core";
// import { Interval, Note, Scale, Midi } from "tonal";
import Synth from "./instruments/Synth";
import Rhodes from "./instruments/Rhodes";
import Noise from "./instruments/Noise.js";
import TapeNoise from "./instruments/TapeNoise.js";
import GrainTrain from "./instruments/GrainTrain.js";
import LowPassFilter from "./effects/LowPassFilter.js";
import HighPassFilter from "./effects/HighPassFilter.js";
import Delay from "./effects/Delay";
import Reverb from "./effects/Reverb";
import DrumRack from "./instruments/DrumRack.js";
import DrumSynth from "./instruments/DrumSynth";
import Simpler from "./instruments/Simpler";
import Drive from "./effects/Drive";
import Tremolo from "./effects/Tremolo";
import Chorus from "./effects/Chorus";
import {
  createEffectParamRef,
  type EffectParamRef,
  type ParameterSetter,
} from "./effectRefs";
import Transpose from "./midiEffects/Transpose";
import Humanize from "./midiEffects/Humanize";
import type { MidiEffect, MidiNoteEvent } from "./midiEffects/types";

interface Config {
  tracks: any[]
  masterGain?: number
}

interface EngineOptions {
  onRequestRender?: () => void
}

type ChannelEntry = {
  trackId: string
  gainRef: EffectParamRef
  instrument: any
  midiEffects: MidiEffect[]
  effects: any[]
}

class Engine {
  channels: Record<number, ChannelEntry[]>
  parameterSetters: Map<string, ParameterSetter>
  trackGainSetters: Map<string, ParameterSetter>
  masterGainRef: EffectParamRef
  masterGainSetter: ParameterSetter
  core: any
  private onRequestRender?: () => void

  constructor(config: Config, core: any, options: EngineOptions = {}) {
    this.core = core;
    this.onRequestRender = options.onRequestRender;
    this.channels = {};
    this.parameterSetters = new Map();
    this.trackGainSetters = new Map();
    this.masterGainRef = createEffectParamRef(
      core,
      "master-gain",
      config.masterGain ?? 1
    );
    this.masterGainSetter = (gain) =>
      this.masterGainRef.setValue({ value: gain });
    config.tracks.forEach((track: any) => {
      this.addTrack(track);
    });
  }

  addTrack(track: any): boolean {
    const {
      id: trackId,
      midiChannel,
      instrument,
      effects = [],
      midiEffects = [],
    } = track;
    const gainRef = createEffectParamRef(
      this.core,
      `track-gain-${trackId}`,
      track.gain ?? 1
    );
    this.trackGainSetters.set(trackId, (gain) =>
      gainRef.setValue({ value: gain })
    );

    const channelEntry: ChannelEntry = {
      trackId,
      gainRef,
      instrument: null as any,
      midiEffects: [],
      effects: [],
    };

    const midiEffectsRack = midiEffects
      .map((effect: any) => this.createMidiEffect(effect))
      .filter(Boolean) as MidiEffect[];

    const effectsRack = effects
      .map((effect: any) => this.createEffect(effect))
      .filter(Boolean);

    const createdInstrument = this.createInstrument(instrument);
    if (!createdInstrument) {
      midiEffectsRack.forEach((effect) => effect.dispose?.());
      return false;
    }

    channelEntry.instrument = createdInstrument;
    channelEntry.midiEffects = midiEffectsRack;
    channelEntry.effects = effectsRack;

    if (!this.channels[midiChannel]) {
      this.channels[midiChannel] = [];
    }
    this.channels[midiChannel].push(channelEntry);
    return true;
  }

  private createMidiEffect(effect: any): MidiEffect | null {
    let instance: MidiEffect | null = null;
    switch (effect.type) {
      case "transpose": {
        instance = new Transpose(effect.id, effect.parameters);
        break;
      }
      case "humanize": {
        instance = new Humanize(effect.id, effect.parameters);
        break;
      }
      default: {
        console.error(`MIDI effect ${effect.type} not supported`);
        return null;
      }
    }
    this.registerParameterSetters(instance, effect.parameters ?? {});
    return instance;
  }

  private createEffect(effect: any) {
    let instance = null;
    switch (effect.type) {
      case "lowPassFilter": {
        instance = new LowPassFilter(effect.id);
        break;
      }
      case "highPassFilter": {
        instance = new HighPassFilter(effect.id);
        break;
      }
      case "delay": {
        instance = new Delay(effect.id, this.core, effect.parameters);
        break;
      }
      case "drive":
      case "distortion": {
        instance = new Drive(effect.id, this.core, effect.parameters);
        break;
      }
      case "tremolo": {
        instance = new Tremolo(effect.id, this.core, effect.parameters);
        break;
      }
      case "chorus": {
        instance = new Chorus(effect.id, this.core, effect.parameters);
        break;
      }
      case "reverb": {
        instance = new Reverb(effect.id, this.core, effect.parameters);
        break;
      }
      default: {
        console.error(`Effect ${effect.type} not supported`);
        return null;
      }
    }
    this.registerParameterSetters(instance, effect.parameters ?? {});
    return instance;
  }

  private registerParameterSetters(
    instance: { registerParameterSetters?: (
      setters: Map<string, ParameterSetter>,
      parameters: Record<string, any>,
      requestRender?: () => void
    ) => void } | null,
    parameters: Record<string, any>
  ) {
    instance?.registerParameterSetters?.(
      this.parameterSetters,
      parameters,
      () => this.onRequestRender?.()
    );
  }

  private createInstrument(instrument: any) {
    const parameters = instrument.parameters ?? {};
    switch (instrument?.type) {
      case "synth": {
        const instance = new Synth(instrument.id, this.core, parameters);
        this.registerParameterSetters(instance, parameters);
        return instance;
      }
      case "rhodes": {
        const instance = new Rhodes(instrument.id, this.core, parameters);
        this.registerParameterSetters(instance, parameters);
        return instance;
      }
      case "drumRack": {
        return new DrumRack(instrument.id, instrument.config, this.core);
      }
      case "drumSynth": {
        return new DrumSynth(instrument.id, instrument.config, this.core);
      }
      case "simpler": {
        return new Simpler(instrument.id, instrument.config, this.core);
      }
      case "noise": {
        return new Noise(instrument.id, this.core);
      }
      case "grainTrain": {
        return new GrainTrain(instrument.id);
      }
      case "tapeNoise": {
        return new TapeNoise(instrument.id, this.core);
      }
      default: {
        console.error(`Instrument ${instrument?.type} not supported`);
        return null;
      }
    }
  }

  noteOn(channel: number, note: number, velocity: number) {
    this.channels[channel]?.forEach((entry) => {
      this.processMidiNoteOn(entry, [{ note, velocity }]);
    });
  }

  noteOff(channel: number, note: number, velocity: number = 0) {
    this.channels[channel]?.forEach((entry) => {
      this.processMidiNoteOff(entry, [{ note, velocity }]);
    });
  }

  private processMidiNoteOn(entry: ChannelEntry, events: MidiNoteEvent[]) {
    this.runMidiEffectChain(entry, 0, events, (output) => {
      output.forEach(({ note, velocity }) => {
        entry.instrument?.noteOn(note, velocity);
      });
    });
  }

  private runMidiEffectChain(
    entry: ChannelEntry,
    index: number,
    events: MidiNoteEvent[],
    done: (events: MidiNoteEvent[]) => void
  ) {
    if (events.length === 0) {
      return;
    }

    if (index >= entry.midiEffects.length) {
      done(events);
      return;
    }

    entry.midiEffects[index].handleNoteOn(events, (output) => {
      this.runMidiEffectChain(entry, index + 1, output, done);
    });
  }

  private runMidiEffectChainOff(
    entry: ChannelEntry,
    index: number,
    events: MidiNoteEvent[],
    done: (events: MidiNoteEvent[]) => void
  ) {
    if (events.length === 0) {
      return;
    }

    if (index >= entry.midiEffects.length) {
      done(events);
      return;
    }

    entry.midiEffects[index].handleNoteOff(events, (output) => {
      this.runMidiEffectChainOff(entry, index + 1, output, done);
    });
  }

  private processMidiNoteOff(entry: ChannelEntry, events: MidiNoteEvent[]) {
    this.runMidiEffectChainOff(entry, 0, events, (output) => {
      output.forEach(({ note, velocity }) => {
        entry.instrument?.noteOff(note, velocity);
      });
    });
  }

  dispose() {
    for (const entries of Object.values(this.channels)) {
      for (const entry of entries) {
        entry.midiEffects.forEach((effect) => effect.dispose?.());
      }
    }
  }

  setParameter(parameterId: string, value: any) {
    void this.parameterSetters.get(parameterId)?.(value);
  }

  setTrackGain(trackId: string, gain: number) {
    void this.trackGainSetters.get(trackId)?.(gain);
  }

  private findChannelEntry(trackId: string): ChannelEntry | null {
    for (const entries of Object.values(this.channels)) {
      const entry = entries.find((item) => item.trackId === trackId);
      if (entry) return entry;
    }
    return null;
  }

  addEffect(trackId: string, effect: any): boolean {
    const entry = this.findChannelEntry(trackId);
    if (!entry) return false;

    const instance = this.createEffect(effect);
    if (!instance) return false;

    entry.effects.push(instance);
    return true;
  }

  addMidiEffect(trackId: string, effect: any): boolean {
    const entry = this.findChannelEntry(trackId);
    if (!entry) return false;

    const instance = this.createMidiEffect(effect);
    if (!instance) return false;

    entry.midiEffects.push(instance);
    return true;
  }

  setTrackMidiChannel(trackId: string, newChannel: number): boolean {
    if (newChannel < 1 || newChannel > 16) return false;

    const entry = this.findChannelEntry(trackId);
    if (!entry) return false;

    for (const [channelKey, entries] of Object.entries(this.channels)) {
      const channel = Number(channelKey);
      const index = entries.findIndex((item) => item === entry);
      if (index < 0) continue;

      if (channel === newChannel) return true;

      const [movedEntry] = entries.splice(index, 1);
      if (entries.length === 0) {
        delete this.channels[channel];
      }

      if (!this.channels[newChannel]) {
        this.channels[newChannel] = [];
      }
      this.channels[newChannel].push(movedEntry);
      return true;
    }

    return false;
  }

  setMasterGain(gain: number) {
    void this.masterGainSetter?.(gain);
  }

  render() {
    const signals = Object.values(this.channels).map((channel) => {
      const instrumentSignals = channel.map((entry) => {
        let signal = entry.instrument.render();
        entry.effects.forEach((effect) => {
          signal = effect.render(signal);
        });
        return el.mul(signal, entry.gainRef.node);
      });
      return el.add(...instrumentSignals);
    });
    const mix =
      signals.length > 0
        ? el.add(...signals)
        : el.const({ key: "master-silence", value: 0 });
    const mastered = el.mul(mix, this.masterGainRef.node);
    return el.tanh(el.mul(mastered, 0.5));
  }
}

export default Engine;
