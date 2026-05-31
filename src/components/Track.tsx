import {
  Box,
  Collapse,
  IconButton,
  Slider,
  ToggleButton,
  Typography,
} from "@mui/material";
import { FiberManualRecord } from "@mui/icons-material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import useLiveSetStore from "../store/liveSet";
import TrackDetails from "./TrackDetails";

export const STRIP_WIDTH = 88;
const EXPANDED_WIDTH = 520;

interface Props {
  track: any;
  expanded: boolean;
  onToggleExpand: () => void;
}

function Track({
  track,
  expanded,
  onToggleExpand,
}: Props) {
  const armedTracks = useLiveSetStore((state) => state.armedTracks);
  const toggleArmedTrack = useLiveSetStore((state) => state.toggleArmedTrack);
  const setSelectedTrackId = useLiveSetStore(
    (state) => state.setSelectedTrackId
  );
  const setTrackGain = useLiveSetStore((state) => state.setTrackGain);
  const gain = track.gain ?? 1;
  const isArmed = armedTracks.includes(track.id);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        height: "100%",
        flexShrink: 0,
        borderRight: 1,
        borderColor: "divider",
        bgcolor: expanded ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.28)",
      }}
    >
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
          cursor: "pointer",
          bgcolor: isArmed ? "rgba(42, 157, 143, 0.12)" : "transparent",
          borderLeft: 3,
          borderColor: expanded
            ? "primary.main"
            : isArmed
              ? "primary.dark"
              : "transparent",
        }}
        onClick={() => setSelectedTrackId(track.id)}
      >
        <IconButton
          size="small"
          aria-label={expanded ? "Collapse channel" : "Expand channel"}
          aria-expanded={expanded}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
        >
          {expanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>

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
            maxHeight: 72,
            overflow: "hidden",
            textOverflow: "ellipsis",
            flexShrink: 0,
          }}
        >
          {track.name}
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
          onClick={(e) => e.stopPropagation()}
        >
          <Slider
            orientation="vertical"
            value={gain}
            min={0}
            max={1}
            step={0.01}
            aria-label={`${track.name} gain`}
            onChange={(_, value) =>
              setTrackGain(track.id, value as number)
            }
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
            {Math.round(gain * 100)}
          </Typography>
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: "0.65rem", lineHeight: 1, flexShrink: 0 }}
        >
          ch {track.midiChannel}
        </Typography>

        <ToggleButton
          value={track.id}
          selected={isArmed}
          size="small"
          sx={{ flexShrink: 0 }}
          onClick={(e) => e.stopPropagation()}
          onChange={() => toggleArmedTrack(track.id)}
        >
          <FiberManualRecord color={isArmed ? "primary" : "default"} />
        </ToggleButton>
      </Box>

      <Collapse
        orientation="horizontal"
        in={expanded}
        unmountOnExit
        sx={{ height: "100%" }}
      >
        <Box
          sx={{
            width: { xs: 300, sm: EXPANDED_WIDTH },
            maxWidth: "min(70vw, 640px)",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderLeft: 1,
            borderColor: "divider",
            bgcolor: "rgba(0, 0, 0, 0.2)",
          }}
        >
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              p: { xs: 1, md: 1.5 },
            }}
          >
            <TrackDetails track={track} layout="strip" />
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

export default Track;
