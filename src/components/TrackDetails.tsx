import { useState } from "react";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import Instrument from "./Instrument";
import Effect from "./Effect";
import AddEffectDialog from "./AddEffectDialog";

interface Props extends React.PropsWithChildren {
  track: any;
  layout?: "strip" | "row";
}

function TrackDetails({ children, track, layout = "row" }: Props) {
  const instrument = track?.instrument;
  const isStrip = layout === "strip";
  const effects = track?.effects ?? [];
  const [addEffectOpen, setAddEffectOpen] = useState(false);

  return (
    <Box
      sx={{
        height: isStrip ? "auto" : "100%",
        minHeight: isStrip ? 200 : 280,
        overflowX: isStrip ? "visible" : "auto",
        overflowY: isStrip ? "visible" : "hidden",
        display: "flex",
        flexDirection: isStrip ? "column" : "row",
        gap: isStrip ? 2 : 3,
        alignItems: isStrip ? "stretch" : "flex-start",
      }}
    >
      {children}
      {instrument && <Instrument instrument={instrument}></Instrument>}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: isStrip ? 1 : 2,
          width: isStrip ? "100%" : "auto",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            px: 0.5,
          }}
        >
          <Typography variant="subtitle2" color="primary" fontWeight={600}>
            Effects
          </Typography>
          <Tooltip title="Add effect">
            <IconButton
              size="small"
              aria-label="Add effect"
              onClick={() => setAddEffectOpen(true)}
              color="primary"
              sx={{
                border: 1,
                borderColor: "divider",
                borderStyle: "dashed",
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        {effects.map((effect: any) => (
          <Effect key={effect.id} effect={effect} />
        ))}
      </Box>
      <AddEffectDialog
        trackId={track.id}
        open={addEffectOpen}
        onClose={() => setAddEffectOpen(false)}
      />
    </Box>
  );
}

export default TrackDetails;
