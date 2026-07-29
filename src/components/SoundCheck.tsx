import { useCallback, useEffect } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Drawer,
  Stack,
  Typography,
} from "@mui/material";
import useLiveSetStore from "../store/liveSet";
import { shouldAutoConnectMqtt } from "../store/mqttSettings";
import Tracks from "./Tracks";
import SideBar, { SIDEBAR_WIDTH } from "./SideBar";
import FileBrowser from "./FileBrowser";
import SetsLibrary from "./SetsLibrary";
import MqttPanel from "./MqttPanel";
import MidiPanel from "./MidiPanel";
import Keyboard from "./Keyboard";
import useAppStore from "../store/app";

const DRAWER_WIDTH = 520;

type SidebarPanel = "fileBrowser" | "setsLibrary" | "mqtt" | "midi";

function SoundCheck() {
  const showFileBrowser = useAppStore((state) => state.showFileBrowser);
  const setShowFileBrowser = useAppStore((state) => state.setShowFileBrowser);
  const showSetsLibrary = useAppStore((state) => state.showSetsLibrary);
  const setShowSetsLibrary = useAppStore((state) => state.setShowSetsLibrary);
  const showMqttPanel = useAppStore((state) => state.showMqttPanel);
  const setShowMqttPanel = useAppStore((state) => state.setShowMqttPanel);
  const showMidiPanel = useAppStore((state) => state.showMidiPanel);
  const setShowMidiPanel = useAppStore((state) => state.setShowMidiPanel);
  const setSidebarPanel = useAppStore((state) => state.setSidebarPanel);
  const showVirtualKeyboard = useAppStore((state) => state.showVirtualKeyboard);
  const initOrchestra = useLiveSetStore((state) => state.init);
  const listenToMidi = useLiveSetStore((state) => state.listenToMidi);
  const connectMqtt = useLiveSetStore((state) => state.connectMqtt);
  const start = useLiveSetStore((state) => state.start);
  const engine = useLiveSetStore((state) => state.engine);
  const tracks = useLiveSetStore((state) => state.tracks);
  const armedTracks = useLiveSetStore((state) => state.armedTracks);
  const loading = useLiveSetStore((state) => state.loading);
  const saveCurrentSet = useLiveSetStore((state) => state.saveCurrentSet);
  const newEmptySet = useLiveSetStore((state) => state.newEmptySet);
  const activeSidebarPanel: SidebarPanel | null = showFileBrowser
    ? "fileBrowser"
    : showSetsLibrary
      ? "setsLibrary"
      : showMqttPanel
        ? "mqtt"
        : showMidiPanel
          ? "midi"
          : null;

  useEffect(() => {
    const bootstrap = async () => {
      await initOrchestra();
      listenToMidi();
      const { mqttSettings } = useLiveSetStore.getState();
      if (shouldAutoConnectMqtt(mqttSettings)) {
        connectMqtt();
      }
    };

    if (useLiveSetStore.persist.hasHydrated()) {
      void bootstrap();
      return;
    }

    return useLiveSetStore.persist.onFinishHydration(() => {
      void bootstrap();
    });
  }, [initOrchestra, listenToMidi, connectMqtt]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;

      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        saveCurrentSet();
      } else if (key === "o") {
        event.preventDefault();
        setShowFileBrowser(false);
        setShowSetsLibrary(true);
      } else if (key === "n") {
        event.preventDefault();
        void newEmptySet();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveCurrentSet, newEmptySet, setShowFileBrowser, setShowSetsLibrary]);

  const handleKeyPressed = useCallback(
    (note: number, velocity: number) => {
      if (!engine) return;
      tracks
        .filter((track) => armedTracks.includes(track.id))
        .forEach((track) => {
          engine.noteOn(track.midiChannel, note, velocity);
        });
    },
    [engine, tracks, armedTracks]
  );

  const handleKeyReleased = useCallback(
    (note: number, velocity: number) => {
      if (!engine) return;
      tracks
        .filter((track) => armedTracks.includes(track.id))
        .forEach((track) => {
          engine.noteOff(track.midiChannel, note, velocity);
        });
    },
    [engine, tracks, armedTracks]
  );

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "row",
        overflow: "hidden",
        bgcolor: "background.default",
      }}
    >
      <SideBar />

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          p: { xs: 2, md: 3 },
          gap: 2,
          overflow: engine ? "hidden" : "auto",
        }}
      >
        {!engine && (
          <Stack
            spacing={2}
            sx={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              maxWidth: 420,
              mx: "auto",
              width: "100%",
            }}
          >
            <Typography variant="h5" color="primary" sx={{ textAlign: "center" }}>
              Sound check
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
              Start the audio engine, then add tracks to build your live set.
            </Typography>
            <Button
              onClick={start}
              variant="contained"
              size="large"
              fullWidth
              disabled={loading}
              startIcon={
                loading ? <CircularProgress size={16} color="inherit" /> : null
              }
            >
              Turn on the engine
            </Button>
          </Stack>
        )}

        {engine && (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
              <Tracks />
            </Box>
            {showVirtualKeyboard && (
              <Box
                sx={{
                  flexShrink: 0,
                  borderTop: 1,
                  borderColor: "divider",
                  bgcolor: "rgba(0, 0, 0, 0.35)",
                  borderRadius: 2,
                  px: 1.5,
                  py: 1,
                }}
              >
                <Keyboard
                  compact
                  onKeyPressed={handleKeyPressed}
                  onKeyReleased={handleKeyReleased}
                />
              </Box>
            )}
          </Box>
        )}
      </Box>

      <Drawer
        anchor="left"
        open={activeSidebarPanel !== null}
        onClose={() => setSidebarPanel(null)}
        sx={{
          left: SIDEBAR_WIDTH,
          "& .MuiBackdrop-root": {
            left: SIDEBAR_WIDTH,
            width: `calc(100% - ${SIDEBAR_WIDTH}px)`,
          },
          "& .MuiDrawer-paper": {
            left: SIDEBAR_WIDTH,
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            bgcolor: "background.default",
            borderRight: 1,
            borderColor: "divider",
          },
        }}
      >
        {activeSidebarPanel === "fileBrowser" && (
          <FileBrowser onClose={() => setShowFileBrowser(false)} />
        )}
        {activeSidebarPanel === "setsLibrary" && (
          <SetsLibrary onClose={() => setShowSetsLibrary(false)} />
        )}
        {activeSidebarPanel === "mqtt" && (
          <MqttPanel onClose={() => setShowMqttPanel(false)} />
        )}
        {activeSidebarPanel === "midi" && (
          <MidiPanel onClose={() => setShowMidiPanel(false)} />
        )}
      </Drawer>
    </Box>
  );
}

export default SoundCheck;
