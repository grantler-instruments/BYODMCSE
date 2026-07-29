export interface MidiSettings {
  enabled: boolean;
  inputId: string | null;
}

export function defaultMidiSettings(): MidiSettings {
  return {
    enabled: true,
    inputId: null,
  };
}

export function normalizeMidiSettings(
  value: Partial<MidiSettings> | null | undefined
): MidiSettings {
  return {
    enabled: value?.enabled !== false,
    inputId: typeof value?.inputId === "string" ? value.inputId : null,
  };
}
