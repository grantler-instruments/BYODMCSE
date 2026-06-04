import { v4 as uuidv4 } from "uuid";
import { DRIVE_MODES, DRIVE_MODE_PRESETS } from "./drivePresets";
import { reidParameters } from "./trackFactory";

export type EffectType =
  | "delay"
  | "gainDelay"
  | "drive"
  | "tremolo"
  | "chorus"
  | "reverb"
  | "lowPassFilter"
  | "highPassFilter";

export const EFFECT_OPTIONS: { type: EffectType; label: string }[] = [
  { type: "delay", label: "Delay" },
  { type: "gainDelay", label: "Gain Delay" },
  { type: "reverb", label: "Reverb" },
  { type: "chorus", label: "Chorus" },
  { type: "drive", label: "Drive" },
  { type: "tremolo", label: "Tremolo" },
  { type: "lowPassFilter", label: "Low Pass" },
  { type: "highPassFilter", label: "High Pass" },
];

const effectTemplates: Record<
  EffectType,
  { name: string; type: EffectType; parameters: Record<string, unknown> }
> = {
  delay: {
    name: "Delay",
    type: "delay",
    parameters: {
      active: { id: "", name: "Active", value: true },
      time: {
        id: "",
        name: "Time",
        value: 500,
        options: { min: 0, max: 10000 },
      },
      mix: {
        id: "",
        name: "Mix",
        value: 0.5,
        options: { min: 0, max: 1 },
      },
      feedback: {
        id: "",
        name: "Feedback",
        value: 0.4,
        options: { min: 0, max: 0.95 },
      },
    },
  },
  gainDelay: {
    name: "Gain Delay",
    type: "gainDelay",
    parameters: {
      active: { id: "", name: "Active", value: true },
      time: {
        id: "",
        name: "Time",
        value: 480,
        options: { min: 40, max: 3000 },
      },
      repeats: {
        id: "",
        name: "Repeats",
        value: 0.55,
        options: { min: 0, max: 0.92 },
      },
      swell: {
        id: "",
        name: "Swell",
        value: 0.42,
        options: { min: 0, max: 1 },
      },
      drift: {
        id: "",
        name: "Drift",
        value: 0.38,
        options: { min: 0, max: 1 },
      },
      shimmer: {
        id: "",
        name: "Shimmer",
        value: 0.32,
        options: { min: 0, max: 1 },
      },
      tone: {
        id: "",
        name: "Tone",
        value: 3200,
        options: { min: 400, max: 12000 },
      },
      space: {
        id: "",
        name: "Space",
        value: 0.28,
        options: { min: 0, max: 1 },
      },
      mix: {
        id: "",
        name: "Mix",
        value: 0.45,
        options: { min: 0, max: 1 },
      },
    },
  },
  drive: {
    name: "Drive",
    type: "drive",
    parameters: {
      active: { id: "", name: "Active", value: true },
      mode: {
        id: "",
        name: "Mode",
        value: "overdrive",
        options: DRIVE_MODES,
      },
      drive: {
        id: "",
        name: "Drive",
        value: DRIVE_MODE_PRESETS.overdrive.drive,
        options: { min: 0, max: 15 },
      },
      tone: {
        id: "",
        name: "Tone",
        value: DRIVE_MODE_PRESETS.overdrive.tone,
        options: { min: 500, max: 12000 },
      },
      mix: {
        id: "",
        name: "Mix",
        value: DRIVE_MODE_PRESETS.overdrive.mix,
        options: { min: 0, max: 1 },
      },
    },
  },
  tremolo: {
    name: "Tremolo",
    type: "tremolo",
    parameters: {
      active: { id: "", name: "Active", value: true },
      rate: {
        id: "",
        name: "Rate",
        value: 4.5,
        options: { min: 0, max: 12 },
      },
      depth: {
        id: "",
        name: "Depth",
        value: 0.3,
        options: { min: 0, max: 1 },
      },
      mix: {
        id: "",
        name: "Mix",
        value: 0.5,
        options: { min: 0, max: 1 },
      },
    },
  },
  chorus: {
    name: "Chorus",
    type: "chorus",
    parameters: {
      active: { id: "", name: "Active", value: true },
      rate: {
        id: "",
        name: "Rate",
        value: 0.8,
        options: { min: 0.1, max: 5 },
      },
      depth: {
        id: "",
        name: "Depth",
        value: 6,
        options: { min: 0, max: 20 },
      },
      time: {
        id: "",
        name: "Delay",
        value: 25,
        options: { min: 5, max: 50 },
      },
      mix: {
        id: "",
        name: "Mix",
        value: 0.45,
        options: { min: 0, max: 1 },
      },
    },
  },
  reverb: {
    name: "Reverb",
    type: "reverb",
    parameters: {
      active: { id: "", name: "Active", value: true },
      mix: {
        id: "",
        name: "Mix",
        value: 0.4,
        options: { min: 0, max: 1 },
      },
      size: {
        id: "",
        name: "Size",
        value: 0.75,
        options: { min: 0, max: 1 },
      },
      decay: {
        id: "",
        name: "Decay",
        value: 0.8,
        options: { min: 0, max: 1 },
      },
      mod: {
        id: "",
        name: "Modulation",
        value: 0.3,
        options: { min: 0, max: 1 },
      },
    },
  },
  lowPassFilter: {
    name: "Low Pass",
    type: "lowPassFilter",
    parameters: {},
  },
  highPassFilter: {
    name: "High Pass",
    type: "highPassFilter",
    parameters: {},
  },
};

export function createEffect(effectType: EffectType) {
  const template = effectTemplates[effectType];
  return {
    id: uuidv4(),
    name: template.name,
    type: template.type,
    parameters: reidParameters(template.parameters),
  };
}
