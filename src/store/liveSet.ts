import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import WebRenderer from "@elemaudio/web-renderer";
import { WebMidi } from "webmidi";
import { MqttMidi } from "@grantler-instruments/mqtt-midi";
import config from "../assets/config.json";
import axios from "axios";
import { loadSample, map } from "../audio/utils";
import Engine from "../audio/Engine";
import useAppStore from "./app";

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
  init: () => void;
  start: () => void;
  render: () => void;
  toggleArmedTrack: (id: string) => void;
  setSelectedInstrumentId: (id: string | null) => void;
  setParameterValue: (id: string, value: any) => void;
  getParameterValue: (deviceId: string, parameterKey: string) => any;
  subscribeToMqtt: (roomId: string) => void;
  setSelectedTrackId: (trackId: string | null) => void;
  setTrackGain: (trackId: string, gain: number) => void;
  setMasterGain: (gain: number) => void;
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

async function commitRender(engine: Engine) {
  const mainOut = engine.render();
  await core.render(mainOut, mainOut);
}

function getBrokerUrl(config: any): string {
  const fromEnv = import.meta.env.VITE_MQTT_BROKER_URL;
  if (fromEnv) return fromEnv;

  const connection = config?.connection;
  if (import.meta.env.DEV && connection?.["broker.local"]) {
    return connection["broker.local"];
  }

  const broker = connection?.broker;
  if (broker) return broker;

  console.warn(
    "No MQTT broker configured. Set VITE_MQTT_BROKER_URL or connection.broker in config."
  );
  return "";
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
        init: async () => {
          set({ loading: true });
          let params = new URLSearchParams(document.location.search);
          let configUrl = params.get("config"); 
          if (configUrl) {
            const config = (await axios.get(configUrl)).data;
            const tracks = config.tracks;
            console.log("loading config from external url");
            set({
              config,
              tracks: normalizeTracks(tracks),
              mappings: config.mappings,
            });
          } else {
            console.log("loading config from internal json");
            set({
              config,
              tracks: normalizeTracks(config.tracks),
              mappings: config.mappings,
            });
          }
          set({ loading: false });
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
              { ...config, masterGain: get().masterGain },
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
          const brokerUrl = getBrokerUrl(get().config);
          if (!brokerUrl) return;

          void (async () => {
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

              const parameter = findParameterById(
                get().tracks,
                destination.parameter
              );
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
            });

            try {
              await client.connect();
              mqttMidi = client;
            } catch (err) {
              console.error("MQTT MIDI connect failed:", err);
            }
          })();
        },
        setSelectedTrackId: (selectedTrackId: string | null) => {
          set({ selectedTrackId });
          if (useAppStore.getState().showFileBrowser) {
            useAppStore.getState().setShowFileBrowser(false);
          }
        },
        setTrackGain: (trackId: string, gain: number) => {
          const tracks = get().tracks.map((track) =>
            track.id === trackId ? { ...track, gain } : track
          );
          set({ tracks });
          get().engine?.setTrackGain(trackId, gain);
        },
        setMasterGain: (gain: number) => {
          set({ masterGain: gain });
          get().engine?.setMasterGain(gain);
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
        partialize: (state: any) => {
          return {};
        },
      }
    ),
    { name: "liveSet" }
  )
);

export default useLiveSetStore;
export { core };
