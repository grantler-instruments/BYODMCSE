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
  createEffect,
  type EffectType,
} from "../audio/effectFactory";
import {
  createTrack,
  type InstrumentType,
} from "../audio/trackFactory";
import useAppStore from "./app";
import { createDraft, parseImportedSet, snapshotSetState, type SavedSet, type SetDraft } from "./savedSet";
import {
  defaultMqttSettings,
  mergeMqttSettingsForLoad,
  normalizeMqttSettings,
  resolveBrokerUrl,
  shouldAutoConnectMqtt,
  type MqttSettings,
  type MqttStatus,
} from "./mqttSettings";
import { v4 as uuidv4 } from "uuid";

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
  setSelectedTrackId: (trackId: string | null) => void;
  setTrackGain: (trackId: string, gain: number) => void;
  setTrackMidiChannel: (trackId: string, midiChannel: number) => void;
  setMasterGain: (gain: number) => void;
  addTrack: (
    instrumentType: InstrumentType,
    midiChannel: number,
    name?: string
  ) => void;
  addEffect: (trackId: string, effectType: EffectType) => void;
  saveNewSet: (name: string) => void;
  updateActiveSet: (name?: string) => void;
  saveCurrentSet: () => void;
  loadSet: (id: string) => Promise<void>;
  newEmptySet: () => Promise<void>;
  importSet: (data: unknown, suggestedName?: string) => Promise<boolean>;
  deleteSet: (id: string) => void;
  listenToMidi: () => void;
}

function normalizeTracks(tracks: any[]) {
  return tracks.map((track) => ({
    ...track,
    gain: track.gain ?? 1,
  }));
}

let ctx: AudioContext;
const core = new WebRenderer();
let mqttMidi: MqttMidi | null = null;
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

async function connectMqttAsync(get: LiveSetGetter, set: LiveSetSetter) {
  const { mqttSettings, config } = get();
  const brokerUrl = resolveBrokerUrl(config, mqttSettings.brokerUrl);
  const roomId = mqttSettings.roomId.trim() || "demo";

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

  try {
    if (mqttMidi) {
      await mqttMidi.disconnect();
      mqttMidi = null;
    }

    const client = new MqttMidi({
      url: brokerUrl,
      prefix: `byod/${roomId}`,
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
              core
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
            const engine = new Engine(
              { tracks: get().tracks, masterGain: get().masterGain },
              core
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
                }
              });
            }
          }
          set({ tracks });
          get().engine?.setParameter(id, value);
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
        saveNewSet: (name: string) => {
          const trimmed = name.trim();
          if (!trimmed) return;

          const snapshot = snapshotSetState({
            tracks: get().tracks,
            masterGain: get().masterGain,
            mappings: get().mappings ?? {},
            mqttSettings: get().mqttSettings,
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

          set({
            tracks: normalizeTracks(saved.tracks),
            masterGain: saved.masterGain,
            mappings: saved.mappings ?? {},
            mqttSettings,
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

          autoSaveDraft(get, set, true);
        },
        newEmptySet: async () => {
          const mqttSettings = {
            ...defaultMqttSettings(get().config),
            autoConnect: false,
          };

          set({
            tracks: [],
            masterGain: 1,
            mqttSettings,
            activeSetId: null,
            activeSetName: null,
            armedTracks: [],
            selectedTrackId: null,
          });

          if (get().engine) {
            await get().rebuildEngine();
          }

          await teardownMqttConnection(set);
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
          const snapshot = snapshotSetState({
            tracks,
            masterGain: parsed.masterGain,
            mappings: parsed.mappings,
            mqttSettings,
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
          if (await navigator.requestMIDIAccess()) {
            WebMidi.enable()
              .then(() => {
                console.log("WebMidi enabled!");
                onEnabled();
              })
              .catch((err) => alert(err));
          }

          function onEnabled() {
            // Inputs
            WebMidi.inputs.forEach((input) => {
              console.log(input.name);
              input.channels.forEach((channel, index) => {
                channel.addListener("noteon", (e) => {
                  const engine = get().engine;
                  engine?.noteOn(channel.number, e.note.number, e.data[2]);
                });
                channel.addListener("noteoff", (e) => {
                  const engine = get().engine;
                  engine?.noteOff(channel.number, e.note.number);
                });
                channel.addListener("controlchange", (e) => {
                  const engine = get().engine;
                  const render = get().render;
                  // const control = e.controller.number;
                  // const value = e.value;
                  // const destination = mappings[control];
                  // if (destination) {
                  //   const matchedInstruments = [
                  //     ...Object.values(engine.channels).filter(
                  //       (channel) => channel?.instrument?.id === destination.device
                  //     ),
                  //   ].map((channel) => channel.instrument);
                  //   let effects = [];
                  //   Object.values(engine.channels).forEach((channel) => {
                  //     effects = effects.concat(channel.effects);
                  //   });
                  //   const matchedEffects = effects.filter(
                  //     (effect) => effect.id === destination.device
                  //   );
                  //   [...matchedInstruments, ...matchedEffects].forEach((device) => {
                  //     if (device.setParameter) {
                  //       device.setParameter(
                  //         destination.parameter,
                  //         map(value, 0, 1, destination.min, destination.max)
                  //       );
                  //     }
                  //   });
                  // }
                  // if (engine) {
                  //   render();
                  // }
                });
              });
            });

            // Outputs
            // WebMidi.outputs.forEach((output) => console.log(output.name));
          }
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
