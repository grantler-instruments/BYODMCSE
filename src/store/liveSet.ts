import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import WebRenderer from "@elemaudio/web-renderer";
import { WebMidi } from "webmidi";
import { MqttMidi } from "@grantler-instruments/mqtt-midi";
import config from "../assets/config.json";
import axios from "axios";
import { loadSample, map } from "../audio/utils";
import Engine from "../audio/Engine";
import {
  applyDriveModePreset,
  isDriveMode,
  normalizeDriveEffect,
} from "../audio/drivePresets";
import {
  createEffect,
  type EffectType,
} from "../audio/effectFactory";
import {
  createMidiEffect,
  type MidiEffectType,
} from "../audio/midiEffectFactory";
import {
  createTrack,
  type InstrumentType,
} from "../audio/trackFactory";
import useAppStore from "./app";
import { createDraft, parseImportedSet, snapshotSetState, type SavedSet, type SetDraft } from "./savedSet";
import {
  defaultMqttSettings,
  buildMqttTopicPrefix,
  mergeMqttSettingsForLoad,
  normalizeMqttSettings,
  resolveBrokerUrl,
  shouldAutoConnectMqtt,
  type MqttSettings,
  type MqttStatus,
} from "./mqttSettings";
import {
  defaultMidiSettings,
  normalizeMidiSettings,
  type MidiSettings,
} from "./midiSettings";
import { v4 as uuidv4 } from "uuid";
import { reidParameters } from "../audio/trackFactory";

interface State {
  config: any;
  tracks: any[];
  mappings: any;
  armedTracks: string[];
  selectedInstrument: string | null;
  engine: any | null;
  loading: boolean;
  selectedTrackId: string | null;
  masterGain: number;
  savedSets: SavedSet[];
  draft: SetDraft | null;
  activeSetId: string | null;
  activeSetName: string | null;
  mqttSettings: MqttSettings;
  mqttStatus: MqttStatus;
  mqttError: string | null;
  midiSettings: MidiSettings;
  midiInputs: { id: string; name: string }[];
  midiError: string | null;
  init: () => void;
  start: () => void;
  rebuildEngine: () => Promise<void>;
  render: () => void;
  toggleArmedTrack: (id: string) => void;
  setSelectedInstrumentId: (id: string | null) => void;
  setParameterValue: (id: string, value: any) => void;
  getParameterValue: (deviceId: string, parameterKey: string) => any;
  subscribeToMqtt: (roomId: string) => void;
  setMqttSettings: (settings: Partial<MqttSettings>) => void;
  connectMqtt: () => void;
  disconnectMqtt: () => Promise<void>;
  reconnectMqtt: () => Promise<void>;
  setMidiSettings: (settings: Partial<MidiSettings>) => Promise<void>;
  listenToMidi: () => Promise<void>;
  setSelectedTrackId: (trackId: string | null) => void;
  setTrackGain: (trackId: string, gain: number) => void;
  setTrackMidiChannel: (trackId: string, midiChannel: number) => void;
  renameTrack: (trackId: string, name: string) => void;
  duplicateTrack: (trackId: string) => Promise<void>;
  deleteTrack: (trackId: string) => Promise<void>;
  setMasterGain: (gain: number) => void;
  addTrack: (
    instrumentType: InstrumentType,
    midiChannel: number,
    name?: string
  ) => void;
  addEffect: (trackId: string, effectType: EffectType) => void;
  addMidiEffect: (trackId: string, effectType: MidiEffectType) => void;
  reorderEffects: (
    trackId: string,
    fromIndex: number,
    toIndex: number
  ) => Promise<void>;
  reorderMidiEffects: (
    trackId: string,
    fromIndex: number,
    toIndex: number
  ) => Promise<void>;
  saveNewSet: (name: string) => void;
  updateActiveSet: (name?: string) => void;
  saveCurrentSet: () => void;
  loadSet: (id: string) => Promise<void>;
  newEmptySet: () => Promise<void>;
  importSet: (data: unknown, suggestedName?: string) => Promise<boolean>;
  deleteSet: (id: string) => void;
}

function normalizeTracks(tracks: any[]) {
  return tracks.map((track) => ({
    ...track,
    gain: track.gain ?? 1,
    effects: (track.effects ?? []).map(normalizeDriveEffect),
    midiEffects: track.midiEffects ?? [],
  }));
}

function cloneTrackWithFreshIds(track: any) {
  const cloned = reidParameters(
    JSON.parse(JSON.stringify(track))
  ) as any;
  cloned.id = uuidv4();
  if (cloned.instrument) {
    cloned.instrument.id = uuidv4();
  }
  cloned.effects = (cloned.effects ?? []).map((effect: any) => ({
    ...effect,
    id: uuidv4(),
  }));
  cloned.midiEffects = (cloned.midiEffects ?? []).map((effect: any) => ({
    ...effect,
    id: uuidv4(),
  }));
  cloned.name = `${track.name} Copy`;
  return cloned;
}

let ctx: AudioContext;
const core = new WebRenderer();
let mqttMidi: MqttMidi | null = null;
let midiEnabled = false;
let renderChain = Promise.resolve();
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
const AUTO_SAVE_DELAY_MS = 400;

type LiveSetGetter = () => State;
type LiveSetSetter = (
  partial: Partial<State> | ((state: State) => Partial<State>)
) => void;

function autoSaveDraft(get: LiveSetGetter, set: LiveSetSetter, immediate = false) {
  const write = () => {
    const state = get();
    set({
      draft: createDraft({
        tracks: state.tracks,
        masterGain: state.masterGain,
        mappings: state.mappings ?? {},
        mqttSettings: state.mqttSettings,
        midiSettings: state.midiSettings,
        activeSetId: state.activeSetId,
        activeSetName: state.activeSetName,
      }),
    });
  };

  if (immediate) {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    write();
    return;
  }

  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  autoSaveTimer = setTimeout(() => {
    autoSaveTimer = null;
    write();
  }, AUTO_SAVE_DELAY_MS);
}

function findParameterById(tracks: any[], parameterId: string) {
  for (const track of tracks) {
    for (const key of Object.keys(track?.instrument?.parameters ?? {})) {
      const param = track.instrument.parameters[key];
      if (param?.id === parameterId) return param;
    }
    for (const effect of track.effects ?? []) {
      for (const key of Object.keys(effect.parameters ?? {})) {
        const param = effect.parameters[key];
        if (param?.id === parameterId) return param;
      }
    }
    for (const effect of track.midiEffects ?? []) {
      for (const key of Object.keys(effect.parameters ?? {})) {
        const param = effect.parameters[key];
        if (param?.id === parameterId) return param;
      }
    }
  }
  return null;
}

async function teardownMqttConnection(set: LiveSetSetter) {
  if (mqttMidi) {
    try {
      await mqttMidi.disconnect();
    } catch (err) {
      console.error("MQTT disconnect failed:", err);
    }
    mqttMidi = null;
  }
  set({ mqttStatus: "disconnected", mqttError: null });
}

function syncActiveSetMqtt(get: LiveSetGetter, set: LiveSetSetter) {
  const { activeSetId, mqttSettings, savedSets } = get();
  if (!activeSetId) return;

  set({
    savedSets: savedSets.map((item) =>
      item.id === activeSetId
        ? {
            ...item,
            mqtt: {
              brokerUrl: mqttSettings.brokerUrl,
              roomId: mqttSettings.roomId || "demo",
              autoConnect: mqttSettings.autoConnect !== false,
            },
            updatedAt: new Date().toISOString(),
          }
        : item
    ),
  });
}

function syncActiveSetMidi(get: LiveSetGetter, set: LiveSetSetter) {
  const { activeSetId, midiSettings, savedSets } = get();
  if (!activeSetId) return;

  set({
    savedSets: savedSets.map((item) =>
      item.id === activeSetId
        ? {
            ...item,
            midi: midiSettings,
            updatedAt: new Date().toISOString(),
          }
        : item
    ),
  });
}

function availableMidiInputs() {
  return WebMidi.inputs.map((input) => ({
    id: input.id,
    name: input.name || "Unnamed MIDI input",
  }));
}

async function stopMidi(set: LiveSetSetter) {
  if (midiEnabled) {
    WebMidi.disable();
    midiEnabled = false;
  }
  set({ midiError: null });
}

async function connectMidi(get: LiveSetGetter, set: LiveSetSetter) {
  const settings = get().midiSettings;
  if (!settings.enabled) {
    await stopMidi(set);
    return;
  }

  try {
    if (midiEnabled) {
      WebMidi.disable();
      midiEnabled = false;
    }
    await WebMidi.enable();
    midiEnabled = true;

    const midiInputs = availableMidiInputs();
    const input = settings.inputId
      ? WebMidi.inputs.find((item) => item.id === settings.inputId)
      : WebMidi.inputs[0];

    set({
      midiInputs,
      midiError:
        settings.inputId && !input
          ? "The selected MIDI input is unavailable."
          : null,
    });

    if (!input) return;

    input.channels.forEach((channel) => {
      channel.addListener("noteon", (event) => {
        const engine = get().engine;
        if (event.data[2] === 0) {
          engine?.noteOff(channel.number, event.note.number);
        } else {
          engine?.noteOn(channel.number, event.note.number, event.data[2]);
        }
      });
      channel.addListener("noteoff", (event) => {
        get().engine?.noteOff(channel.number, event.note.number);
      });
    });
  } catch (error) {
    midiEnabled = false;
    set({
      midiError: error instanceof Error ? error.message : String(error),
    });
  }
}

async function connectMqttAsync(get: LiveSetGetter, set: LiveSetSetter) {
  const { mqttSettings, config } = get();
  const brokerUrl = resolveBrokerUrl(config, mqttSettings.brokerUrl);
  const topicPrefix = buildMqttTopicPrefix(mqttSettings);

  if (!brokerUrl) {
    set({
      mqttStatus: "error",
      mqttError: "Broker URL is required.",
    });
    return;
  }

  set({ mqttStatus: "connecting", mqttError: null });

  set({
    mqttSettings: { ...get().mqttSettings, autoConnect: true },
  });
  syncActiveSetMqtt(get, set);

  try {
    if (mqttMidi) {
      await mqttMidi.disconnect();
      mqttMidi = null;
    }

    const client = new MqttMidi({
      url: brokerUrl,
      prefix: topicPrefix,
    });

    client.on("noteOn", ({ channel, note, velocity }) => {
      const engine = get().engine;
      if (velocity === 0) {
        engine?.noteOff(channel, note);
      } else {
        engine?.noteOn(channel, note, velocity);
      }
    });

    client.on("noteOff", ({ channel, note }) => {
      get().engine?.noteOff(channel, note);
    });

    client.on("controlChange", ({ channel, controller, value }) => {
      const destination = get().mappings[`${channel},${controller}`];
      if (!destination) return;

      const parameter = findParameterById(get().tracks, destination.parameter);
      if (!parameter) return;

      if (typeof parameter.value === "number") {
        get().setParameterValue(
          destination.parameter,
          map(
            value,
            0,
            127,
            parameter.options?.min,
            parameter.options?.max
          )
        );
      } else if (typeof parameter.value === "boolean") {
        get().setParameterValue(destination.parameter, value > 0);
      }
    });

    client.on("error", (err) => {
      console.error("MQTT MIDI error:", err);
      set({
        mqttStatus: "error",
        mqttError: err instanceof Error ? err.message : String(err),
      });
    });

    await client.connect();
    mqttMidi = client;
    set({ mqttStatus: "connected", mqttError: null });
    syncActiveSetMqtt(get, set);
    autoSaveDraft(get, set, true);
  } catch (err) {
    console.error("MQTT MIDI connect failed:", err);
    set({
      mqttStatus: "error",
      mqttError: err instanceof Error ? err.message : String(err),
    });
  }
}

async function commitRender(engine: Engine) {
  const mainOut = engine.render();
  await core.render(mainOut, mainOut);
}

const useLiveSetStore = create<State>()(
  devtools(
    persist(
      (set, get) => ({
        config: null,
        tracks: [],
        mappings: {},
        armedTracks: [],
        selectedInstrument: null,
        engine: null,
        loading: false,
        selectedTrackId: null,
        masterGain: 1,
        savedSets: [],
        draft: null,
        activeSetId: null,
        activeSetName: null,
        mqttSettings: defaultMqttSettings(config),
        mqttStatus: "disconnected",
        mqttError: null,
        midiSettings: defaultMidiSettings(),
        midiInputs: [],
        midiError: null,
        init: async () => {
          set({ loading: true });
          let params = new URLSearchParams(document.location.search);
          let configUrl = params.get("config");
          let baseConfig = config;

          if (configUrl) {
            baseConfig = (await axios.get(configUrl)).data;
            console.log("loading config from external url");
          } else {
            console.log("loading config from internal json");
          }

          const { savedSets, draft, activeSetId, activeSetName } = get();
          const linkedSetId = draft?.activeSetId ?? activeSetId;
          const linkedSet = linkedSetId
            ? savedSets.find((item) => item.id === linkedSetId)
            : null;

          set({
            config: baseConfig,
            tracks: normalizeTracks(
              draft?.tracks ?? linkedSet?.tracks ?? []
            ),
            mappings:
              draft?.mappings ??
              linkedSet?.mappings ??
              baseConfig.mappings ??
              {},
            masterGain: draft?.masterGain ?? linkedSet?.masterGain ?? 1,
            mqttSettings: normalizeMqttSettings(
              draft?.mqttSettings ?? linkedSet?.mqtt,
              baseConfig
            ),
            midiSettings: normalizeMidiSettings(
              draft?.midiSettings ?? linkedSet?.midi
            ),
            activeSetId: draft?.activeSetId ?? activeSetId ?? null,
            activeSetName:
              draft?.activeSetName ??
              activeSetName ??
              linkedSet?.name ??
              null,
            loading: false,
          });
        },
        start: async () => {
          set({ loading: true });
          const config = get().config;
          ctx = new window.AudioContext();
          if (ctx.state === "suspended") {
            await ctx.resume();
          }

          core.on("load", async () => {
            const files: any = {};
            const entries = Object.entries(config.files);
            for (let i = 0; i < entries.length; i++) {
              const [key, path] = entries[i];
              files[key] = await loadSample(path, ctx);
            }

            core.updateVirtualFileSystem(files);
            const engine = new Engine(
              { tracks: get().tracks, masterGain: get().masterGain },
              core,
              { onRequestRender: () => get().render() }
            );
            try {
              await commitRender(engine);
              set({ engine, loading: false });
            } catch (error) {
              console.error("Audio engine render failed:", error);
              set({ engine: null, loading: false });
            }
          });
          const node = await core.initialize(ctx, {
            numberOfInputs: 0,
            numberOfOutputs: 1,
            outputChannelCount: [2],
          });
          node.connect(ctx.destination);
        },
        rebuildEngine: async () => {
          if (!get().config) return;

          set({ loading: true });
          try {
            get().engine?.dispose();
            const engine = new Engine(
              { tracks: get().tracks, masterGain: get().masterGain },
              core,
              { onRequestRender: () => get().render() }
            );
            await commitRender(engine);
            set({ engine, loading: false, armedTracks: [], selectedTrackId: null });
          } catch (error) {
            console.error("Audio engine rebuild failed:", error);
            set({ engine: null, loading: false });
          }
        },
        render() {
          const engine = get().engine;
          if (!engine) return;

          renderChain = renderChain
            .then(() => commitRender(engine))
            .catch((error) => {
              console.error("Audio render failed:", error);
            });
        },
        toggleArmedTrack(id: string) {
          const { armedTracks } = get();
          if (armedTracks.includes(id)) {
            set({ armedTracks: armedTracks.filter((t: any) => t !== id) });
          } else {
            set({ armedTracks: [...armedTracks, id] });
          }
        },
        setSelectedInstrumentId(id: string | null) {
          set({ selectedInstrument: id });
        },
        setParameterValue(id: string, value: any) {
          const tracks = [...get().tracks];
          const engineUpdates: Array<[string, any]> = [[id, value]];

          for (const track of tracks) {
            const keys = Object.keys(track?.instrument.parameters);
            keys.forEach((key) => {
              if (track?.instrument.parameters[key]?.id === id) {
                track.instrument.parameters[key].value = value;
              }
            });
            for (const effect of track.effects) {
              const keys = Object.keys(effect.parameters);
              keys.forEach((key) => {
                if (effect.parameters[key]?.id === id) {
                  effect.parameters[key].value = value;

                  if (
                    effect.type === "drive" &&
                    key === "mode" &&
                    isDriveMode(value)
                  ) {
                    for (const update of applyDriveModePreset(effect, value)) {
                      engineUpdates.push([update.id, update.value]);
                    }
                  }
                }
              });
            }
            for (const effect of track.midiEffects ?? []) {
              const keys = Object.keys(effect.parameters ?? {});
              keys.forEach((key) => {
                if (effect.parameters[key]?.id === id) {
                  effect.parameters[key].value = value;
                }
              });
            }
          }
          set({ tracks });
          for (const [paramId, paramValue] of engineUpdates) {
            get().engine?.setParameter(paramId, paramValue);
          }
          autoSaveDraft(get, set);
        },
        getParameterValue(deviceId: string, parameterKey: string) {
          const instruments = get().tracks.map(
            (track: any) => track.instrument
          );

          const effects = get()
            .tracks.map((track: any) => track.effects)
            .flat();

          const devices = [...instruments, ...effects].filter(
            (device: any) => device.id === deviceId
          );
          if (devices.length > 0) {
            return devices[0].parameters[parameterKey].value;
          }

          return null;
        },
        subscribeToMqtt(roomId: string) {
          set({
            mqttSettings: {
              ...get().mqttSettings,
              roomId,
              brokerUrl:
                get().mqttSettings.brokerUrl ||
                resolveBrokerUrl(get().config),
            },
          });
          get().connectMqtt();
        },
        setMqttSettings: (settings: Partial<MqttSettings>) => {
          set({
            mqttSettings: {
              ...get().mqttSettings,
              ...settings,
            },
          });
          syncActiveSetMqtt(get, set);
          autoSaveDraft(get, set, true);
        },
        connectMqtt: () => {
          void connectMqttAsync(get, set);
        },
        disconnectMqtt: async () => {
          await teardownMqttConnection(set);
          set({
            mqttSettings: { ...get().mqttSettings, autoConnect: false },
          });
          syncActiveSetMqtt(get, set);
          autoSaveDraft(get, set, true);
        },
        reconnectMqtt: async () => {
          await get().disconnectMqtt();
          get().connectMqtt();
        },
        setMidiSettings: async (settings: Partial<MidiSettings>) => {
          const midiSettings = normalizeMidiSettings({
            ...get().midiSettings,
            ...settings,
          });
          set({ midiSettings });
          syncActiveSetMidi(get, set);
          autoSaveDraft(get, set, true);
          await connectMidi(get, set);
        },
        setSelectedTrackId: (selectedTrackId: string | null) => {
          set({ selectedTrackId });
          if (useAppStore.getState().showFileBrowser) {
            useAppStore.getState().setShowFileBrowser(false);
          }
          if (useAppStore.getState().showSetsLibrary) {
            useAppStore.getState().setShowSetsLibrary(false);
          }
          if (useAppStore.getState().showMqttPanel) {
            useAppStore.getState().setShowMqttPanel(false);
          }
        },
        setTrackGain: (trackId: string, gain: number) => {
          const tracks = get().tracks.map((track) =>
            track.id === trackId ? { ...track, gain } : track
          );
          set({ tracks });
          get().engine?.setTrackGain(trackId, gain);
          autoSaveDraft(get, set);
        },
        setTrackMidiChannel: (trackId: string, midiChannel: number) => {
          const tracks = get().tracks.map((track) =>
            track.id === trackId ? { ...track, midiChannel } : track
          );
          set({ tracks });
          get().engine?.setTrackMidiChannel(trackId, midiChannel);
          autoSaveDraft(get, set);
        },
        renameTrack: (trackId: string, name: string) => {
          const trimmedName = name.trim();
          if (!trimmedName) return;
          const tracks = get().tracks.map((track) =>
            track.id === trackId ? { ...track, name: trimmedName } : track
          );
          set({ tracks });
          autoSaveDraft(get, set, true);
        },
        duplicateTrack: async (trackId: string) => {
          const previousTracks = get().tracks;
          const track = previousTracks.find((item) => item.id === trackId);
          if (!track) return;

          const clonedTrack = cloneTrackWithFreshIds(track);
          const index = previousTracks.findIndex((item) => item.id === trackId);
          const tracks = [...previousTracks];
          tracks.splice(index + 1, 0, clonedTrack);

          set({ tracks, selectedTrackId: clonedTrack.id });
          autoSaveDraft(get, set, true);

          if (get().engine) {
            await get().rebuildEngine();
            set({ selectedTrackId: clonedTrack.id });
          }
        },
        deleteTrack: async (trackId: string) => {
          const previousTracks = get().tracks;
          if (!previousTracks.some((item) => item.id === trackId)) return;

          const tracks = previousTracks.filter((item) => item.id !== trackId);
          const selectedTrackId =
            get().selectedTrackId === trackId ? null : get().selectedTrackId;
          const armedTracks = get().armedTracks.filter((id) => id !== trackId);

          set({ tracks, selectedTrackId, armedTracks });
          autoSaveDraft(get, set, true);

          if (get().engine) {
            await get().rebuildEngine();
          }
        },
        setMasterGain: (gain: number) => {
          set({ masterGain: gain });
          get().engine?.setMasterGain(gain);
          autoSaveDraft(get, set);
        },
        addTrack: (
          instrumentType: InstrumentType,
          midiChannel: number,
          name?: string
        ) => {
          const previousTracks = get().tracks;
          const track = createTrack(
            instrumentType,
            midiChannel,
            name,
            previousTracks.length + 1
          );
          set({ tracks: [...previousTracks, track] });

          const engine = get().engine;
          if (!engine) {
            autoSaveDraft(get, set, true);
            return;
          }

          const added = engine.addTrack(track);
          if (!added) {
            set({ tracks: previousTracks });
            console.error(
              `Failed to add track with instrument ${instrumentType}`
            );
            return;
          }

          get().render();
          autoSaveDraft(get, set, true);
        },
        addEffect: (trackId: string, effectType: EffectType) => {
          const effect = createEffect(effectType);
          const previousTracks = get().tracks;
          const tracks = previousTracks.map((track) =>
            track.id === trackId
              ? { ...track, effects: [...(track.effects ?? []), effect] }
              : track
          );
          set({ tracks });

          const engine = get().engine;
          if (!engine) {
            autoSaveDraft(get, set, true);
            return;
          }

          const added = engine.addEffect(trackId, effect);
          if (!added) {
            set({ tracks: previousTracks });
            console.error(`Failed to add effect ${effectType} to track ${trackId}`);
            return;
          }

          get().render();
          autoSaveDraft(get, set, true);
        },
        addMidiEffect: (trackId: string, effectType: MidiEffectType) => {
          const effect = createMidiEffect(effectType);
          const previousTracks = get().tracks;
          const tracks = previousTracks.map((track) =>
            track.id === trackId
              ? {
                  ...track,
                  midiEffects: [...(track.midiEffects ?? []), effect],
                }
              : track
          );
          set({ tracks });

          const engine = get().engine;
          if (!engine) {
            autoSaveDraft(get, set, true);
            return;
          }

          const added = engine.addMidiEffect(trackId, effect);
          if (!added) {
            set({ tracks: previousTracks });
            console.error(
              `Failed to add MIDI effect ${effectType} to track ${trackId}`
            );
            return;
          }

          autoSaveDraft(get, set, true);
        },
        reorderEffects: async (trackId: string, fromIndex: number, toIndex: number) => {
          if (fromIndex === toIndex) return;

          const previousTracks = get().tracks;
          const tracks = previousTracks.map((track) => {
            if (track.id !== trackId) return track;
            const effects = [...(track.effects ?? [])];
            if (
              fromIndex < 0 ||
              toIndex < 0 ||
              fromIndex >= effects.length ||
              toIndex >= effects.length
            ) {
              return track;
            }
            const [moved] = effects.splice(fromIndex, 1);
            effects.splice(toIndex, 0, moved);
            return { ...track, effects };
          });

          set({ tracks });
          autoSaveDraft(get, set, true);

          if (get().engine) {
            await get().rebuildEngine();
            set({ selectedTrackId: trackId });
          }
        },
        reorderMidiEffects: async (
          trackId: string,
          fromIndex: number,
          toIndex: number
        ) => {
          if (fromIndex === toIndex) return;

          const previousTracks = get().tracks;
          const tracks = previousTracks.map((track) => {
            if (track.id !== trackId) return track;
            const midiEffects = [...(track.midiEffects ?? [])];
            if (
              fromIndex < 0 ||
              toIndex < 0 ||
              fromIndex >= midiEffects.length ||
              toIndex >= midiEffects.length
            ) {
              return track;
            }
            const [moved] = midiEffects.splice(fromIndex, 1);
            midiEffects.splice(toIndex, 0, moved);
            return { ...track, midiEffects };
          });

          set({ tracks });
          autoSaveDraft(get, set, true);

          if (get().engine) {
            await get().rebuildEngine();
            set({ selectedTrackId: trackId });
          }
        },
        saveNewSet: (name: string) => {
          const trimmed = name.trim();
          if (!trimmed) return;

          const snapshot = snapshotSetState({
            tracks: get().tracks,
            masterGain: get().masterGain,
            mappings: get().mappings ?? {},
            mqttSettings: get().mqttSettings,
            midiSettings: get().midiSettings,
          });
          const savedSet: SavedSet = {
            id: uuidv4(),
            name: trimmed,
            ...snapshot,
            updatedAt: new Date().toISOString(),
          };

          set({
            savedSets: [...get().savedSets, savedSet],
            activeSetId: savedSet.id,
            activeSetName: trimmed,
          });
          autoSaveDraft(get, set, true);
        },
        updateActiveSet: (name?: string) => {
          const activeSetId = get().activeSetId;
          if (!activeSetId) return;

          const existing = get().savedSets.find((item) => item.id === activeSetId);
          if (!existing) return;

          const trimmed = (name ?? existing.name).trim();
          if (!trimmed) return;

          const snapshot = snapshotSetState({
            tracks: get().tracks,
            masterGain: get().masterGain,
            mappings: get().mappings ?? {},
            mqttSettings: get().mqttSettings,
            midiSettings: get().midiSettings,
          });
          const savedSet: SavedSet = {
            ...existing,
            name: trimmed,
            ...snapshot,
            updatedAt: new Date().toISOString(),
          };

          set({
            savedSets: get().savedSets.map((item) =>
              item.id === activeSetId ? savedSet : item
            ),
            activeSetName: trimmed,
          });
          autoSaveDraft(get, set, true);
        },
        saveCurrentSet: () => {
          const { activeSetId, activeSetName, savedSets } = get();

          if (activeSetId) {
            get().updateActiveSet(activeSetName ?? undefined);
            return;
          }

          const name =
            activeSetName?.trim() || `Set ${savedSets.length + 1}`;
          get().saveNewSet(name);
        },
        loadSet: async (id: string) => {
          const saved = get().savedSets.find((item) => item.id === id);
          if (!saved) return;

          const mqttSettings = mergeMqttSettingsForLoad(
            saved.mqtt,
            get().mqttSettings,
            get().config
          );
          const midiSettings = normalizeMidiSettings(saved.midi);

          set({
            tracks: normalizeTracks(saved.tracks),
            masterGain: saved.masterGain,
            mappings: saved.mappings ?? {},
            mqttSettings,
            midiSettings,
            activeSetId: saved.id,
            activeSetName: saved.name,
            armedTracks: [],
            selectedTrackId: null,
          });

          if (get().engine) {
            await get().rebuildEngine();
          }

          await teardownMqttConnection(set);
          if (shouldAutoConnectMqtt(mqttSettings)) {
            get().connectMqtt();
          }
          await connectMidi(get, set);

          autoSaveDraft(get, set, true);
        },
        newEmptySet: async () => {
          const mqttSettings = {
            ...defaultMqttSettings(get().config),
            autoConnect: false,
          };
          const midiSettings = defaultMidiSettings();

          set({
            tracks: [],
            masterGain: 1,
            mqttSettings,
            midiSettings,
            activeSetId: null,
            activeSetName: null,
            armedTracks: [],
            selectedTrackId: null,
          });

          if (get().engine) {
            await get().rebuildEngine();
          }

          await teardownMqttConnection(set);
          await connectMidi(get, set);
          autoSaveDraft(get, set, true);
        },
        importSet: async (data: unknown, suggestedName?: string) => {
          const parsed = parseImportedSet(data, get().config);
          if (!parsed) {
            return false;
          }

          const tracks = normalizeTracks(parsed.tracks);
          const mqttSettings = mergeMqttSettingsForLoad(
            parsed.mqtt,
            get().mqttSettings,
            get().config
          );
          const midiSettings = normalizeMidiSettings(parsed.midi);
          const snapshot = snapshotSetState({
            tracks,
            masterGain: parsed.masterGain,
            mappings: parsed.mappings,
            mqttSettings,
            midiSettings,
          });
          const setName =
            (parsed.name ?? suggestedName ?? "Imported set").trim() ||
            "Imported set";
          const savedSet: SavedSet = {
            id: uuidv4(),
            name: setName,
            ...snapshot,
            updatedAt: new Date().toISOString(),
          };

          set({
            tracks,
            masterGain: parsed.masterGain,
            mappings: parsed.mappings,
            mqttSettings,
            midiSettings,
            savedSets: [...get().savedSets, savedSet],
            activeSetId: savedSet.id,
            activeSetName: savedSet.name,
            armedTracks: [],
            selectedTrackId: null,
          });

          if (get().engine) {
            await get().rebuildEngine();
          }

          await teardownMqttConnection(set);
          if (shouldAutoConnectMqtt(mqttSettings)) {
            get().connectMqtt();
          }
          await connectMidi(get, set);

          autoSaveDraft(get, set, true);
          return true;
        },
        deleteSet: (id: string) => {
          const savedSets = get().savedSets.filter((item) => item.id !== id);
          const updates: Partial<State> = { savedSets };

          if (get().activeSetId === id) {
            updates.activeSetId = null;
            updates.activeSetName = null;
          }

          set(updates);
          autoSaveDraft(get, set, true);
        },
        listenToMidi: async () => {
          await connectMidi(get, set);
        },
      }),
      {
        name: "liveSet",
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          savedSets: state.savedSets,
          draft: state.draft,
          activeSetId: state.activeSetId,
          activeSetName: state.activeSetName,
        }),
      }
    ),
    { name: "liveSet" }
  )
);

export default useLiveSetStore;
export { core };
