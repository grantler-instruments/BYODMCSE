import { el } from "@elemaudio/core";
// import { Interval, Note, Scale, Midi } from "tonal";
import Synth from "./instruments/Synth";
import Noise from "./instruments/Noise.js";
import TapeNoise from "./instruments/TapeNoise.js";
import GrainTrain from "./instruments/GrainTrain.js";
import LowPassFilter from "./effects/LowPassFilter.js";
import HighPassFilter from "./effects/HighPassFilter.js";
import Delay from "./effects/Delay";
import Reverb from "./effects/Reverb";
import Velocity from "./midiEffects/Velocity.js";
import DrumRack from "./instruments/DrumRack.js";
import Simpler from "./instruments/Simpler";
import Distortion from "./effects/Distortion";

interface Config {
  tracks: any[]
}

class Engine {
  channels: any
  constructor(config: Config, core: any) {
    this.channels = {};
    config.tracks.forEach((track: any) => {
      const {midiChannel, instrument, effects, midiEffects} = track
      const effectsRack = effects.map((effect: any) => {
        switch(effect.type){
          case "lowPassFilter": {
            return new LowPassFilter(effect.id)
          }
          case "highPassFilter": {
            return new HighPassFilter(effect.id)
          }
          case "delay": {
            return new Delay(effect.id)
          }
          case "distortion": {
            return new Distortion(effect.id)
          }
          default: {
            console.error(`Effect ${effect.type} not supported`)
            return null
          }
        }
      })
      if(!this.channels[midiChannel]){
        this.channels[midiChannel] = [];
      }
      switch(instrument?.type){
        case "synth": {
          this.channels[midiChannel].push({
            instrument: new Synth(instrument.id, core),
            effects: effectsRack,
          });
          break;
        }
        case "drumRack": {
          this.channels[midiChannel].push({
            instrument: new DrumRack(
              instrument.id,
              instrument.config,
              core
            ),
            effects: effectsRack,
          })
          break;
        }
        case "simpler": {
          this.channels[midiChannel].push({
            instrument: new Simpler(
              instrument.id,
              instrument.config,
              core
            ),
            effects: effectsRack,
          })
          break;
        }
        case "noise": {
          this.channels[midiChannel].push({
            instrument: new Noise(instrument.id),
            effects: effectsRack,
        })
          break;
        }
        case "grainTrain": {
          this.channels[midiChannel].push({
            instrument: new GrainTrain(instrument.id),
            effects: effectsRack,
          });
          break;
        }
        case "tapeNoise": {
          this.channels[midiChannel].push({
            instrument: new TapeNoise(instrument.id),
            effects: effectsRack,
          });
          break;
        }
      }
    })
  }

  noteOn(channel: number, note: number, velocity: number) {
    this.channels[channel]?.forEach((instrument: any) => instrument?.instrument?.noteOn(note, velocity))
  }
  noteOff(channel: number, note: number, velocity: number = 0) {
    this.channels[channel]?.forEach((instrument: any) => instrument?.instrument?.noteOff(note, velocity))
  }

  render() {
    const signals = Object.values(this.channels).map((channel: any) => {
      const instrumentSignals = channel.map((entry: any) => {
        let signal = entry.instrument.render();
        entry.effects.forEach((effect: any) => {
          signal = effect.render(signal);
        });
        return signal;
      });
      return el.add(...instrumentSignals);
    });
    const out = el.add(...signals);
    return el.tanh(el.mul(out, 0.5));
  }
}

export default Engine;
