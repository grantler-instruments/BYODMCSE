import { v4 as uuidv4 } from "uuid";
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
        username: state.mqttSettings.username,
        password: state.mqttSettings.password,
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

async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Fragment format: "<0|1>.<base64url>" — leading flag marks whether the
// payload is gzip-compressed, so encode/decode can run on browsers that
// support CompressionStream and ones that don't without breaking each other.
export async function encodeSetForFragment(payload: unknown): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(payload));
  const canCompress = typeof CompressionStream !== "undefined";
  const bytes = canCompress ? await gzip(json) : json;
  return `${canCompress ? "1" : "0"}.${bytesToBase64Url(bytes)}`;
}

export async function decodeSetFromFragment(encoded: string): Promise<unknown> {
  const [flag, body] = encoded.includes(".")
    ? [encoded.slice(0, encoded.indexOf(".")), encoded.slice(encoded.indexOf(".") + 1)]
    : ["0", encoded];
  const bytes = base64UrlToBytes(body);
  const json =
    flag === "1" && typeof DecompressionStream !== "undefined"
      ? await gunzip(bytes)
      : bytes;
  return JSON.parse(new TextDecoder().decode(json));
}

// Set IDs double as MQTT topic segments and URL query values, so keep them
// to a plain slug: lowercase letters, numbers, hyphens.
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function randomStageId(): string {
  return slugify(uuidv4().split("-")[0]);
}

export function exportFilename(name: string | null) {
  const base = slugify(name || "live-set");
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
