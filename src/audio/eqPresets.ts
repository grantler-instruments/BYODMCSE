export const EQ_BAND_COUNT = 8;

export const EQ_BAND_TYPES = [
  "bell",
  "lowShelf",
  "highShelf",
  "lowCut",
  "highCut",
  "notch",
  "bandPass",
] as const;

export type EqBandType = (typeof EQ_BAND_TYPES)[number];

export function isEqBandType(value: unknown): value is EqBandType {
  return typeof value === "string" && EQ_BAND_TYPES.includes(value as EqBandType);
}

export const EQ_BAND_TYPE_LABELS: Record<EqBandType, string> = {
  bell: "Bell",
  lowShelf: "Low Shelf",
  highShelf: "High Shelf",
  lowCut: "Low Cut",
  highCut: "High Cut",
  notch: "Notch",
  bandPass: "Band Pass",
};

export type EqParam = {
  id: string;
  name: string;
  value: boolean | number | string;
  options?: { min: number; max: number } | string[];
};

export type EqBandParams = {
  index: number;
  active: EqParam & { value: boolean };
  type: EqParam & { value: EqBandType; options: EqBandType[] };
  freq: EqParam & { value: number; options: { min: number; max: number } };
  gain: EqParam & { value: number; options: { min: number; max: number } };
  q: EqParam & { value: number; options: { min: number; max: number } };
};

export function parseEqBands(
  parameters: Record<string, EqParam | undefined>
): EqBandParams[] {
  return Array.from({ length: EQ_BAND_COUNT }, (_, index) => {
    const n = index + 1;
    const defaults = EQ_BAND_DEFAULTS[index];
    const active = parameters[`band${n}Active`];
    const type = parameters[`band${n}Type`];
    const freq = parameters[`band${n}Freq`];
    const gain = parameters[`band${n}Gain`];
    const q = parameters[`band${n}Q`];
    const typeValue = type?.value ?? defaults.type;

    return {
      index,
      active: {
        id: active?.id ?? "",
        name: active?.name ?? `B${n} On`,
        value: typeof active?.value === "boolean" ? active.value : defaults.active,
      },
      type: {
        id: type?.id ?? "",
        name: type?.name ?? `B${n} Type`,
        value: isEqBandType(typeValue) ? typeValue : defaults.type,
        options: [...EQ_BAND_TYPES],
      },
      freq: {
        id: freq?.id ?? "",
        name: freq?.name ?? `B${n} Freq`,
        value: typeof freq?.value === "number" ? freq.value : defaults.frequency,
        options: freq?.options as { min: number; max: number } ?? {
          min: 20,
          max: 20000,
        },
      },
      gain: {
        id: gain?.id ?? "",
        name: gain?.name ?? `B${n} Gain`,
        value: typeof gain?.value === "number" ? gain.value : defaults.gain,
        options: gain?.options as { min: number; max: number } ?? {
          min: -24,
          max: 24,
        },
      },
      q: {
        id: q?.id ?? "",
        name: q?.name ?? `B${n} Q`,
        value: typeof q?.value === "number" ? q.value : defaults.q,
        options: q?.options as { min: number; max: number } ?? {
          min: 0.05,
          max: 10,
        },
      },
    };
  });
}

export interface EqBandDefaults {
  active: boolean;
  type: EqBandType;
  frequency: number;
  gain: number;
  q: number;
}

/** Log-spaced anchor frequencies (FabFilter-style band layout). */
const ANCHOR_FREQUENCIES = [63, 125, 250, 500, 1000, 2000, 4000, 8000];

export const EQ_BAND_DEFAULTS: EqBandDefaults[] = ANCHOR_FREQUENCIES.map(
  (frequency, index) => ({
    active: index === 0 || index === EQ_BAND_COUNT - 1,
    type: index === 0 ? "lowShelf" : index === EQ_BAND_COUNT - 1 ? "highShelf" : "bell",
    frequency,
    gain: 0,
    q: index === 0 || index === EQ_BAND_COUNT - 1 ? 0.71 : 1,
  })
);

export function buildEqBandParameters(): Record<string, unknown> {
  const parameters: Record<string, unknown> = {};
  EQ_BAND_DEFAULTS.forEach((band, index) => {
    const n = index + 1;
    const label = `B${n}`;
    parameters[`band${n}Active`] = {
      id: "",
      name: `${label} On`,
      value: band.active,
    };
    parameters[`band${n}Type`] = {
      id: "",
      name: `${label} Type`,
      value: band.type,
      options: [...EQ_BAND_TYPES],
    };
    parameters[`band${n}Freq`] = {
      id: "",
      name: `${label} Freq`,
      value: band.frequency,
      options: { min: 20, max: 20000 },
    };
    parameters[`band${n}Gain`] = {
      id: "",
      name: `${label} Gain`,
      value: band.gain,
      options: { min: -24, max: 24 },
    };
    parameters[`band${n}Q`] = {
      id: "",
      name: `${label} Q`,
      value: band.q,
      options: { min: 0.05, max: 10 },
    };
  });
  return parameters;
}
