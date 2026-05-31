import { v4 as uuidv4 } from "uuid";

export type InstrumentType = "synth" | "rhodes" | "drumSynth" | "noise";

export const INSTRUMENT_OPTIONS: { type: InstrumentType; label: string }[] = [
  { type: "synth", label: "Synth" },
  { type: "rhodes", label: "Rhodes" },
  { type: "drumSynth", label: "Drum Synth" },
  { type: "noise", label: "Noise" },
];

export function reidParameters<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => reidParameters(item)) as T;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("id" in obj && "name" in obj && "value" in obj) {
      return { ...obj, id: uuidv4() } as T;
    }
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(obj)) {
      result[key] = reidParameters(nested);
    }
    return result as T;
  }
  return value;
}

const instrumentTemplates: Record<
  InstrumentType,
  Omit<any, "id"> & { type: InstrumentType }
> = {
  synth: {
    name: "Synth",
    type: "synth",
    parameters: {
      attack: {
        id: "",
        name: "Attack",
        value: 0.1,
        options: { min: 0, max: 5 },
      },
      decay: {
        id: "",
        name: "Decay",
        value: 1,
        options: { min: 0, max: 5 },
      },
      sustain: {
        id: "",
        name: "Sustain",
        value: 1,
        options: { min: 0, max: 5 },
      },
      release: {
        id: "",
        name: "Release",
        value: 4,
        options: { min: 0, max: 10 },
      },
      waveformA: {
        id: "",
        name: "Waveform A",
        value: "sine",
        options: ["sine", "saw"],
      },
      amplitudeA: {
        id: "",
        name: "Waveform A",
        value: 0.4,
        options: { min: 0, max: 1 },
      },
      detuneA: {
        id: "",
        name: "Detune A",
        value: 2,
        options: { min: 0, max: 100 },
      },
      waveformB: {
        id: "",
        name: "Waveform B",
        value: "sine",
        options: ["sine", "saw"],
      },
      detuneB: {
        id: "",
        name: "Detune B",
        value: 4,
        options: { min: 0, max: 100 },
      },
      amplitudeB: {
        id: "",
        name: "Amplitude B",
        value: 0.2,
        options: { min: 0, max: 1 },
      },
      waveformC: {
        id: "",
        name: "Waveform C",
        value: "sine",
        options: ["sine", "saw"],
      },
      amplitudeC: {
        id: "",
        name: "Amplitude C",
        value: 0.1,
        options: { min: 0, max: 1 },
      },
      detuneC: {
        id: "",
        name: "Detune C",
        value: 2.3,
        options: { min: 0, max: 100 },
      },
    },
  },
  rhodes: {
    name: "Rhodes",
    type: "rhodes",
    parameters: {
      attack: {
        id: "",
        name: "Attack",
        value: 0.002,
        options: { min: 0, max: 0.5 },
      },
      decay: {
        id: "",
        name: "Decay",
        value: 1.4,
        options: { min: 0, max: 5 },
      },
      sustain: {
        id: "",
        name: "Sustain",
        value: 0.42,
        options: { min: 0, max: 1 },
      },
      release: {
        id: "",
        name: "Release",
        value: 0.9,
        options: { min: 0, max: 5 },
      },
      bell: {
        id: "",
        name: "Bell",
        value: 65,
        options: { min: 0, max: 200 },
      },
      bellRatio: {
        id: "",
        name: "Bell Ratio",
        value: 3.2,
        options: { min: 2, max: 8 },
      },
      filterCutoff: {
        id: "",
        name: "Filter Cutoff",
        value: 2800,
        options: { min: 500, max: 12000 },
      },
      filterEnv: {
        id: "",
        name: "Filter Envelope",
        value: 0.35,
        options: { min: 0, max: 1 },
      },
      tremoloRate: {
        id: "",
        name: "Tremolo Rate",
        value: 4.5,
        options: { min: 0, max: 12 },
      },
      tremoloDepth: {
        id: "",
        name: "Tremolo Depth",
        value: 0.18,
        options: { min: 0, max: 1 },
      },
      drive: {
        id: "",
        name: "Drive",
        value: 1.15,
        options: { min: 0.5, max: 4 },
      },
    },
  },
  drumSynth: {
    name: "Drum Synth",
    type: "drumSynth",
    parameters: {},
    config: {
      "36": { type: "kick", pitch: 40, drive: 4 },
      "38": { type: "clap", tone: 800, decay: 0.3 },
      "42": { type: "hat", pitch: 317, tone: 12000, decay: 0.08 },
      "46": { type: "hat", pitch: 450, tone: 14000, decay: 0.12 },
      "49": { type: "clap", tone: 1200, decay: 0.5 },
    },
  },
  noise: {
    name: "Noise",
    type: "noise",
    parameters: {},
  },
};

export function suggestMidiChannel(tracks: { midiChannel: number }[]): number {
  const used = new Set(tracks.map((track) => track.midiChannel));
  for (let channel = 1; channel <= 16; channel++) {
    if (!used.has(channel)) return channel;
  }
  return 1;
}

export function createTrack(
  instrumentType: InstrumentType,
  midiChannel: number,
  name?: string,
  trackNumber?: number
) {
  const template = instrumentTemplates[instrumentType];
  const label =
    name?.trim() ||
    `${template.name}${trackNumber ? ` ${trackNumber}` : ""}`.trim();

  return {
    id: uuidv4(),
    name: label,
    gain: 1,
    instrument: {
      id: uuidv4(),
      ...reidParameters(template),
    },
    effects: [],
    midiEffects: [],
    midiChannel,
  };
}
