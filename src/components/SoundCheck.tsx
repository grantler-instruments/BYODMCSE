import { useEffect, useState } from "react";
import { Box, Button, CircularProgress } from "@mui/material";
import Keyboard from "./Keyboard";
import useLiveSetStore from "../store/liveSet";
import Tracks from "./Tracks";
import TrackDetails from "./TrackDetails";
import DrumPad from "./DrumPad";
import SideBar from "./SideBar";
import FileBrowser from "./FileBrowser";
import useAppStore from "../store/app";

function SoundCheck() {
  const showFileBrowser = useAppStore((state) => state.showFileBrowser);
  const initOrchestra = useLiveSetStore((state) => state.init);
  const listenToMidi = useLiveSetStore((state) => state.listenToMidi);
  const subscribeToMqtt = useLiveSetStore((state) => state.subscribeToMqtt);
  const start = useLiveSetStore((state) => state.start);
  const engine = useLiveSetStore((state) => state.engine);
  const tracks = useLiveSetStore((state) => state.tracks);
  const selectedTrackId = useLiveSetStore((state) => state.selectedTrackId);
  const armedTracks = useLiveSetStore((state) => state.armedTracks);
  const selectedInstrumentId = useLiveSetStore(
    (state) => state.selectedInstrument
  );
  const loading = useLiveSetStore((state) => state.loading);
  useEffect(() => {
    initOrchestra();
    listenToMidi();
    subscribeToMqtt("demo")
  }, [initOrchestra, listenToMidi, subscribeToMqtt]);

  const instruments = tracks.map((track) => track.instrument);
  const selectedInstrument = instruments.find(
    (instrument) => instrument.id === selectedInstrumentId
  );

  const selectedTrack = tracks.find((track) => track.id === selectedTrackId);

  const handleKeyPressed = (note: number, velocity: number) => {
    if (engine) {
      tracks
        .filter((track) => armedTracks.includes(track.id))
        ?.map((i) => {
          engine.noteOn(i.midiChannel, note, velocity);
        });
    }
  };

  const handleKeyReleased = (note: number, velocity: number) => {
    if (engine) {
      tracks
        .filter((track) => armedTracks.includes(track.id))
        ?.map((i) => {
          engine.noteOff(i.midiChannel, note, velocity);
        });
    }
  };

  return (
    <Box display={"flex"} flexDirection={"row"} width="100%" height="100%">
      <SideBar></SideBar>
      <Box
        display={"flex"}
        flexDirection={"column"}
        sx={{ padding: "24px", width: "100%", height: "100%" }}
      >
        {!engine && (
          <Box sx={{ margin: "24px" }} display={"flex"}>
            <Button
              onClick={start}
              variant={"contained"}
              size="large"
              width={"100%"}
              disabled={loading}
              startIcon={
                loading ? (
                  <CircularProgress size={"12px"}></CircularProgress>
                ) : null
              }
            >
              turn on the engine
            </Button>
          </Box>
        )}

        {engine && (
          <>
            <Box flex={1}>
              <Tracks></Tracks>
            </Box>
            {showFileBrowser && <FileBrowser></FileBrowser>}
            {!showFileBrowser && (
              <TrackDetails>
                {selectedTrack?.instrument.type === "drumRack" && (
                  <DrumPad
                    config={{}}
                    onKeyPressed={handleKeyPressed}
                    onKeyReleased={handleKeyReleased}
                  ></DrumPad>
                )}
                {selectedTrack?.instrument.type !== "drumRack" && (
                  <Keyboard
                    onKeyPressed={handleKeyPressed}
                    onKeyReleased={handleKeyReleased}
                  />
                )}
              </TrackDetails>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}

export default SoundCheck;
