import { registerEffectParameter, type ParameterSetter } from "../effectRefs";
import { coerceBoolean, readParamBoolean, readParamNumber } from "../parameterUtils";
import {
  clampMidiNote,
  clampMidiVelocity,
  type MidiEffect,
  type MidiNoteEvent,
  type MidiNoteHandler,
} from "./types";

class Transpose implements MidiEffect {
  private semitones = 0;
  private active = true;

  constructor(_id: string, parameters: Record<string, any> = {}) {
    this.semitones = readParamNumber(parameters, "semitones", 0);
    this.active = readParamBoolean(parameters, "active", true);
  }

  registerParameterSetters(
    setters: Map<string, ParameterSetter>,
    parameters: Record<string, any>
  ) {
    registerEffectParameter(setters, parameters.semitones, (value) => {
      this.semitones =
        typeof value === "number" ? Math.round(value) : this.semitones;
    });

    registerEffectParameter(setters, parameters.active, (value) => {
      this.active = coerceBoolean(value, this.active);
    });
  }

  handleNoteOn(events: MidiNoteEvent[], next: MidiNoteHandler) {
    next(this.transform(events));
  }

  handleNoteOff(events: MidiNoteEvent[], next: MidiNoteHandler) {
    next(this.transform(events));
  }

  private transform(events: MidiNoteEvent[]): MidiNoteEvent[] {
    if (!this.active || this.semitones === 0) {
      return events;
    }

    return events.map(({ note, velocity }) => ({
      note: clampMidiNote(note + this.semitones),
      velocity: clampMidiVelocity(velocity, 0),
    }));
  }
}

export default Transpose;
