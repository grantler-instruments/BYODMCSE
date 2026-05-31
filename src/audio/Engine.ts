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
import Velocity from "./midiEffects/Velocity.js";
import DrumRack from "./instruments/DrumRack.js";
import DrumSynth from "./instruments/DrumSynth";
import Simpler from "./instruments/Simpler";
import Distortion from "./effects/Distortion";
import Tremolo from "./effects/Tremolo";
import Chorus from "./effects/Chorus";
import {
  createEffectParamRef,
  type EffectParamRef,
  type ParameterSetter,
} from "./effectRefs";

interface Config {
  tracks: any[]
  masterGain?: number
}

class Engine {
  channels: any
  parameterSetters: Map<string, ParameterSetter>
  trackGainSetters: Map<string, ParameterSetter>
  masterGainRef: EffectParamRef
  masterGainSetter: ParameterSetter

  constructor(config: Config, core: any) {
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
      const { id: trackId, midiChannel, instrument, effects, midiEffects } =
        track;
      const gainRef = createEffectParamRef(
        core,
        `track-gain-${trackId}`,
        track.gain ?? 1
      );
      this.trackGainSetters.set(trackId, (gain) =>
        gainRef.setValue({ value: gain })
      );
      const channelEntry = {
        trackId,
        gainRef,
        instrument: null as any,
        effects: [] as any[],
      };
      const effectsRack = effects.map((effect: any) => {
        let instance = null;
        switch(effect.type){
          case "lowPassFilter": {
            instance = new LowPassFilter(effect.id)
            break;
          }
          case "highPassFilter": {
            instance = new HighPassFilter(effect.id)
            break;
          }
          case "delay": {
            instance = new Delay(effect.id, core, effect.parameters)
            break;
          }
          case "distortion": {
            instance = new Distortion(effect.id, core, effect.parameters)
            break;
          }
          case "tremolo": {
            instance = new Tremolo(effect.id, core, effect.parameters)
            break;
          }
          case "chorus": {
            instance = new Chorus(effect.id, core, effect.parameters)
            break;
          }
          default: {
            console.error(`Effect ${effect.type} not supported`)
            return null
          }
        }
        instance?.registerParameterSetters?.(
          this.parameterSetters,
          effect.parameters ?? {}
        );
        return instance;
      })
      if(!this.channels[midiChannel]){
        this.channels[midiChannel] = [];
      }
      switch(instrument?.type){
        case "synth": {
          channelEntry.instrument = new Synth(instrument.id, core);
          break;
        }
        case "rhodes": {
          channelEntry.instrument = new Rhodes(instrument.id, core);
          break;
        }
        case "drumRack": {
          channelEntry.instrument = new DrumRack(
            instrument.id,
            instrument.config,
            core
          );
          break;
        }
        case "drumSynth": {
          channelEntry.instrument = new DrumSynth(
            instrument.id,
            instrument.config,
            core
          );
          break;
        }
        case "simpler": {
          channelEntry.instrument = new Simpler(
            instrument.id,
            instrument.config,
            core
          );
          break;
        }
        case "noise": {
          channelEntry.instrument = new Noise(instrument.id, core);
          break;
        }
        case "grainTrain": {
          channelEntry.instrument = new GrainTrain(instrument.id);
          break;
        }
        case "tapeNoise": {
          channelEntry.instrument = new TapeNoise(instrument.id, core);
          break;
        }
        default: {
          return;
        }
      }
      channelEntry.effects = effectsRack;
      this.channels[midiChannel].push(channelEntry);
    })
  }

  noteOn(channel: number, note: number, velocity: number) {
    this.channels[channel]?.forEach((instrument: any) => instrument?.instrument?.noteOn(note, velocity))
  }
  noteOff(channel: number, note: number, velocity: number = 0) {
    this.channels[channel]?.forEach((instrument: any) => instrument?.instrument?.noteOff(note, velocity))
  }

  setParameter(parameterId: string, value: any) {
    void this.parameterSetters.get(parameterId)?.(value);
  }

  setTrackGain(trackId: string, gain: number) {
    void this.trackGainSetters.get(trackId)?.(gain);
  }

  setMasterGain(gain: number) {
    void this.masterGainSetter?.(gain);
  }

  render() {
    const signals = Object.values(this.channels).map((channel: any) => {
      const instrumentSignals = channel.map((entry: any) => {
        let signal = entry.instrument.render();
        entry.effects.forEach((effect: any) => {
          signal = effect.render(signal);
        });
        return el.mul(signal, entry.gainRef.node);
      });
      return el.add(...instrumentSignals);
    });
    const mix = el.add(...signals);
    const mastered = el.mul(mix, this.masterGainRef.node);
    return el.tanh(el.mul(mastered, 0.5));
  }
}

export default Engine;
