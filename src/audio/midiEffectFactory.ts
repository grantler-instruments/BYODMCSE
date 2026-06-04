import { v4 as uuidv4 } from "uuid";
import { reidParameters } from "./trackFactory";

export type MidiEffectType = "transpose" | "humanize";

export const MIDI_EFFECT_OPTIONS: { type: MidiEffectType; label: string }[] = [
  { type: "transpose", label: "Transpose" },
  { type: "humanize", label: "Humanize" },
];

const midiEffectTemplates: Record<
  MidiEffectType,
  { name: string; type: MidiEffectType; parameters: Record<string, unknown> }
> = {
  transpose: {
    name: "Transpose",
    type: "transpose",
    parameters: {
      active: { id: "", name: "Active", value: true },
      semitones: {
        id: "",
        name: "Semitones",
        value: 0,
        options: { min: -48, max: 48 },
      },
    },
  },
  humanize: {
    name: "Humanize",
    type: "humanize",
    parameters: {
      active: { id: "", name: "Active", value: true },
      timing: {
        id: "",
        name: "Timing",
        value: 12,
        options: { min: 0, max: 50 },
      },
      velocity: {
        id: "",
        name: "Velocity",
        value: 12,
        options: { min: 0, max: 40 },
      },
    },
  },
};

export function createMidiEffect(effectType: MidiEffectType) {
  const template = midiEffectTemplates[effectType];
  return {
    id: uuidv4(),
    name: template.name,
    type: template.type,
    parameters: reidParameters(template.parameters),
  };
}
