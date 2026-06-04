export type MidiNoteEvent = {
  note: number;
  velocity: number;
};

export type MidiNoteHandler = (events: MidiNoteEvent[]) => void;

export interface MidiEffect {
  handleNoteOn(events: MidiNoteEvent[], next: MidiNoteHandler): void;
  handleNoteOff(events: MidiNoteEvent[], next: MidiNoteHandler): void;
  registerParameterSetters?(
    setters: Map<string, (value: unknown) => void | Promise<void>>,
    parameters: Record<string, unknown>
  ): void;
  dispose?(): void;
}

export function clampMidiNote(note: number): number {
  return Math.max(0, Math.min(127, Math.round(note)));
}

export function clampMidiVelocity(velocity: number, min = 1): number {
  return Math.max(min, Math.min(127, Math.round(velocity)));
}
