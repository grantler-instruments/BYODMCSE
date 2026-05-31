import { Box, Slider, Typography } from "@mui/material";
import useLiveSetStore from "../store/liveSet";
import { STRIP_WIDTH } from "./Track";

function MasterTrack() {
  const masterGain = useLiveSetStore((state) => state.masterGain);
  const setMasterGain = useLiveSetStore((state) => state.setMasterGain);

  return (
    <Box
      sx={{
        width: STRIP_WIDTH,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: 1.5,
        px: 0.5,
        gap: 1,
        height: "100%",
        borderLeft: 2,
        borderColor: "primary.main",
        bgcolor: "rgba(42, 157, 143, 0.1)",
        boxShadow: "-4px 0 12px rgba(0, 0, 0, 0.35)",
      }}
    >
      <Typography
        variant="caption"
        color="primary"
        sx={{
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          transform: "rotate(180deg)",
          fontWeight: 700,
          letterSpacing: 1,
          lineHeight: 1.2,
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        Master
      </Typography>

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 80,
          width: "100%",
          py: 0.5,
        }}
      >
        <Slider
          orientation="vertical"
          value={masterGain}
          min={0}
          max={1}
          step={0.01}
          aria-label="Master gain"
          onChange={(_, value) => setMasterGain(value as number)}
          sx={{
            flex: 1,
            height: "100%",
            maxHeight: 160,
            color: "primary.main",
            "& .MuiSlider-thumb": {
              width: 14,
              height: 14,
            },
            "& .MuiSlider-rail": {
              width: 6,
              opacity: 0.35,
            },
            "& .MuiSlider-track": {
              width: 6,
              border: "none",
            },
          }}
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: "0.6rem", lineHeight: 1, mt: 0.5 }}
        >
          {Math.round(masterGain * 100)}
        </Typography>
      </Box>
    </Box>
  );
}

export default MasterTrack;
