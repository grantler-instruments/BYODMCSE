import { registerEffectParameter, type ParameterSetter } from "../effectRefs";
import { coerceBoolean, readParamBoolean, readParamNumber } from "../parameterUtils";
import {
  clampMidiVelocity,
  type MidiEffect,
  type MidiNoteEvent,
  type MidiNoteHandler,
} from "./types";

type PendingNote = {
  noteOnTimer: ReturnType<typeof setTimeout>;
};

class Humanize implements MidiEffect {
  private timingMs = 12;
  private velocityAmount = 12;
  private active = true;
  private disposed = false;
  private pending = new Map<number, PendingNote>();

  constructor(_id: string, parameters: Record<string, any> = {}) {
    this.timingMs = readParamNumber(parameters, "timing", 12);
    this.velocityAmount = readParamNumber(parameters, "velocity", 12);
    this.active = readParamBoolean(parameters, "active", true);
  }

  registerParameterSetters(
    setters: Map<string, ParameterSetter>,
    parameters: Record<string, any>
  ) {
    registerEffectParameter(setters, parameters.timing, (value) => {
      if (typeof value === "number") {
        this.timingMs = Math.max(0, value);
      }
    });

    registerEffectParameter(setters, parameters.velocity, (value) => {
      if (typeof value === "number") {
        this.velocityAmount = Math.max(0, value);
      }
    });

    registerEffectParameter(setters, parameters.active, (value) => {
      this.active = coerceBoolean(value, this.active);
    });
  }

  dispose() {
    this.disposed = true;
    this.pending.forEach((pending) => {
      clearTimeout(pending.noteOnTimer);
    });
    this.pending.clear();
  }

  handleNoteOn(events: MidiNoteEvent[], next: MidiNoteHandler) {
    if (!this.active) {
      next(events);
      return;
    }

    for (const event of events) {
      this.scheduleNoteOn(event, next);
    }
  }

  handleNoteOff(events: MidiNoteEvent[], next: MidiNoteHandler) {
    if (!this.active) {
      next(events);
      return;
    }

    for (const event of events) {
      this.scheduleNoteOff(event, next);
    }
  }

  private scheduleNoteOn(event: MidiNoteEvent, next: MidiNoteHandler) {
    const existing = this.pending.get(event.note);
    if (existing) {
      clearTimeout(existing.noteOnTimer);
    }

    const delay = this.randomTimingMs();
    const velocity = this.jitterVelocity(event.velocity);

    const noteOnTimer = setTimeout(() => {
      if (this.disposed) return;
      this.pending.delete(event.note);
      next([{ note: event.note, velocity }]);
    }, delay);

    this.pending.set(event.note, { noteOnTimer });
  }

  private scheduleNoteOff(event: MidiNoteEvent, next: MidiNoteHandler) {
    const pending = this.pending.get(event.note);
    if (pending) {
      clearTimeout(pending.noteOnTimer);
      this.pending.delete(event.note);
      return;
    }

    const delay = this.randomTimingMs();
    const velocity = event.velocity > 0 ? this.jitterVelocity(event.velocity, 0) : 0;

    setTimeout(() => {
      if (this.disposed) return;
      next([{ note: event.note, velocity }]);
    }, delay);
  }

  private randomTimingMs(): number {
    if (this.timingMs <= 0) return 0;
    return Math.round(Math.random() * this.timingMs);
  }

  private jitterVelocity(velocity: number, min = 1): number {
    if (this.velocityAmount <= 0 || velocity <= 0) {
      return velocity;
    }

    const delta = Math.round((Math.random() * 2 - 1) * this.velocityAmount);
    return clampMidiVelocity(velocity + delta, min);
  }
}

export default Humanize;
