import { v4 as uuidv4 } from "uuid";

export type DriveMode = "overdrive" | "distortion" | "fuzz";

export const DRIVE_MODES: DriveMode[] = ["overdrive", "distortion", "fuzz"];

export interface DrivePreset {
  drive: number;
  tone: number;
  mix: number;
}

export const DRIVE_MODE_PRESETS: Record<DriveMode, DrivePreset> = {
  overdrive: { drive: 1.5, tone: 6000, mix: 0.45 },
  distortion: { drive: 5, tone: 4500, mix: 0.65 },
  fuzz: { drive: 10, tone: 2800, mix: 0.75 },
};

export function isDriveMode(value: unknown): value is DriveMode {
  return typeof value === "string" && value in DRIVE_MODE_PRESETS;
}

export function normalizeDriveEffect(effect: any) {
  if (effect.type !== "distortion" && effect.type !== "drive") {
    return effect;
  }

  const params = { ...(effect.parameters ?? {}) };
  const fallbackMode: DriveMode = "overdrive";

  if (!params.mode) {
    params.mode = {
      id: uuidv4(),
      name: "Mode",
      value: fallbackMode,
      options: DRIVE_MODES,
    };
  }

  if (!params.tone) {
    const mode = isDriveMode(params.mode?.value)
      ? params.mode.value
      : fallbackMode;
    params.tone = {
      id: uuidv4(),
      name: "Tone",
      value: DRIVE_MODE_PRESETS[mode].tone,
      options: { min: 500, max: 12000 },
    };
  }

  if (params.drive) {
    params.drive = {
      ...params.drive,
      options: { min: 0, max: 15 },
    };
  }

  return {
    ...effect,
    type: "drive",
    name: effect.name === "Distortion" ? "Drive" : effect.name || "Drive",
    parameters: params,
  };
}

export function applyDriveModePreset(
  effect: any,
  mode: DriveMode
): Array<{ id: string; value: number }> {
  const preset = DRIVE_MODE_PRESETS[mode];
  const updates: Array<{ id: string; value: number }> = [];
  const params = effect.parameters ?? {};

  for (const key of ["drive", "tone", "mix"] as const) {
    const param = params[key];
    if (!param?.id) continue;
    param.value = preset[key];
    updates.push({ id: param.id, value: preset[key] });
  }

  return updates;
}
