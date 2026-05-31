import { useState } from "react";
import { Box } from "@mui/material";
import useLiveSetStore from "../store/liveSet";
import MasterTrack from "./MasterTrack";
import Track from "./Track";

function Tracks() {
  const tracks = useLiveSetStore((state) => state.tracks);
  const setSelectedTrackId = useLiveSetStore(
    (state) => state.setSelectedTrackId
  );
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);

  const toggleExpand = (trackId: string) => {
    setExpandedTrackId((current) => {
      const next = current === trackId ? null : trackId;
      if (next) {
        setSelectedTrackId(trackId);
      }
      return next;
    });
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        borderRadius: 2,
        bgcolor: "rgba(0, 0, 0, 0.35)",
        boxShadow: "inset 0 2px 12px rgba(0, 0, 0, 0.45)",
      }}
    >
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
          overflowX: "auto",
          overflowY: "hidden",
        }}
      >
        {tracks.map((track) => (
          <Track
            key={track.id}
            track={track}
            expanded={expandedTrackId === track.id}
            onToggleExpand={() => toggleExpand(track.id)}
          />
        ))}
      </Box>
      <MasterTrack />
    </Box>
  );
}

export default Tracks;
