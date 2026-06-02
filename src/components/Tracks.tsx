import { useState } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import useLiveSetStore from "../store/liveSet";
import AddTrackDialog from "./AddTrackDialog";
import MasterTrack from "./MasterTrack";
import Track from "./Track";

function Tracks() {
  const tracks = useLiveSetStore((state) => state.tracks);
  const selectedTrackId = useLiveSetStore((state) => state.selectedTrackId);
  const setSelectedTrackId = useLiveSetStore(
    (state) => state.setSelectedTrackId
  );
  const [addTrackOpen, setAddTrackOpen] = useState(false);

  const toggleExpand = (trackId: string) => {
    const current = useLiveSetStore.getState().selectedTrackId;
    setSelectedTrackId(current === trackId ? null : trackId);
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
            expanded={selectedTrackId === track.id}
            onToggleExpand={() => toggleExpand(track.id)}
          />
        ))}
        <Box
          sx={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            px: 1,
            borderRight: 1,
            borderColor: "divider",
          }}
        >
          <Tooltip title="Add track">
            <IconButton
              aria-label="Add track"
              onClick={() => setAddTrackOpen(true)}
              color="primary"
              sx={{
                border: 1,
                borderColor: "divider",
                borderStyle: "dashed",
              }}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <MasterTrack />
      <AddTrackDialog
        open={addTrackOpen}
        onClose={() => setAddTrackOpen(false)}
      />
    </Box>
  );
}

export default Tracks;
