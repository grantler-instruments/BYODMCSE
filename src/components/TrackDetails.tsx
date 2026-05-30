
import { useEffect } from "react";
import { Box, Button } from "@mui/material";
import Keyboard from "./Keyboard";
import Instrument from "./Instrument";
import useLiveSetStore from "../store/liveSet";
import Tracks from "./Tracks";
import Effect from "./Effect";

interface Props extends React.PropsWithChildren {
  // You can add additional props here if needed
}

function TrackDetails({children}:Props) {
  const tracks = useLiveSetStore(state => state.tracks)
  const selectedTrackId = useLiveSetStore(state => state.selectedTrackId)

  const selectedTrack = tracks.find(track => track.id === selectedTrackId)
  const instrument = selectedTrack?.instrument
  return (
    <Box sx={{ height: "400px", overflowX: "auto", overflowY: "hidden", display: "flex", gap: 3 }}>
      {children}
      {instrument && <Instrument instrument={instrument}></Instrument>}
      {selectedTrack?.effects.map((effect: any) =>{
        return <Effect key={effect.id} effect={effect}></Effect>
      })}
    </Box>
  );
}

export default TrackDetails;
