import {
  normalizeMqttSettings,
  parseMqttSettings,
  type MqttSettings,
} from "./mqttSettings";
import { normalizeMidiSettings, type MidiSettings } from "./midiSettings";

export type { MidiSettings, MqttSettings };

export interface SavedSet {
  id: string;
  name: string;
  tracks: any[];
  masterGain: number;
  mappings: Record<string, unknown>;
  mqtt?: MqttSettings;
  midi?: MidiSettings;
  updatedAt: string;
}

export interface SetDraft {
  tracks: any[];
  masterGain: number;
  mappings: Record<string, unknown>;
  mqttSettings: MqttSettings;
  midiSettings: MidiSettings;
  activeSetId: string | null;
  activeSetName: string | null;
  updatedAt: string;
}

export function snapshotSetState(state: {
  tracks: any[];
  masterGain: number;
  mappings: Record<string, unknown>;
  mqttSettings: MqttSettings;
  midiSettings: MidiSettings;
}): Pick<SavedSet, "tracks" | "masterGain" | "mappings" | "mqtt" | "midi"> {
  return JSON.parse(
    JSON.stringify({
      tracks: state.tracks,
      masterGain: state.masterGain,
      mappings: state.mappings ?? {},
      mqtt: {
        brokerUrl: state.mqttSettings.brokerUrl,
        roomId: state.mqttSettings.roomId || "demo",
        autoConnect: state.mqttSettings.autoConnect !== false,
      },
      midi: state.midiSettings,
    })
  );
}

export function createDraft(state: {
  tracks: any[];
  masterGain: number;
  mappings: Record<string, unknown>;
  mqttSettings: MqttSettings;
  midiSettings: MidiSettings;
  activeSetId: string | null;
  activeSetName: string | null;
}): SetDraft {
  return {
    ...snapshotSetState(state),
    mqttSettings: JSON.parse(JSON.stringify(state.mqttSettings)),
    midiSettings: JSON.parse(JSON.stringify(state.midiSettings)),
    activeSetId: state.activeSetId,
    activeSetName: state.activeSetName,
    updatedAt: new Date().toISOString(),
  };
}

export interface ExportedSetFile {
  version: 2;
  name: string | null;
  masterGain: number;
  mappings: Record<string, unknown>;
  mqtt: MqttSettings;
  midi: MidiSettings;
  connection: {
    broker: string;
    roomId: string;
  };
  tracks: any[];
  exportedAt: string;
}

export function buildExportPayload(state: {
  tracks: any[];
  masterGain: number;
  mappings: Record<string, unknown>;
  activeSetName: string | null;
  mqttSettings?: Partial<MqttSettings> | null;
  midiSettings?: Partial<MidiSettings> | null;
  config?: any;
}): ExportedSetFile {
  const mqtt = normalizeMqttSettings(state.mqttSettings, state.config ?? {});
  const snapshot = snapshotSetState({
    tracks: state.tracks,
    masterGain: state.masterGain,
    mappings: state.mappings ?? {},
    mqttSettings: mqtt,
    midiSettings: normalizeMidiSettings(state.midiSettings),
  });

  return {
    version: 2,
    name: state.activeSetName,
    masterGain: snapshot.masterGain,
    mappings: snapshot.mappings,
    mqtt: snapshot.mqtt!,
    midi: snapshot.midi!,
    connection: {
      broker: snapshot.mqtt!.brokerUrl,
      roomId: snapshot.mqtt!.roomId,
    },
    tracks: snapshot.tracks,
    exportedAt: new Date().toISOString(),
  };
}

export function parseImportedSet(data: unknown, config: any) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.tracks)) {
    return null;
  }

  return {
    name: typeof obj.name === "string" ? obj.name : null,
    masterGain: typeof obj.masterGain === "number" ? obj.masterGain : 1,
    mappings:
      obj.mappings && typeof obj.mappings === "object"
        ? (obj.mappings as Record<string, unknown>)
        : {},
    mqtt: parseMqttSettings(data, config),
    midi:
      obj.midi && typeof obj.midi === "object"
        ? normalizeMidiSettings(obj.midi as Partial<MidiSettings>)
        : undefined,
    tracks: obj.tracks,
  };
}

export function exportFilename(name: string | null) {
  const base = (name || "live-set")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "live-set"}.json`;
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
