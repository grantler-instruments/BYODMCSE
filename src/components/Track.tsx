import { useRef, useState, type MouseEvent, type TouchEvent } from "react";
import {
  Box,
  Collapse,
  Menu,
  MenuItem,
  Select,
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
  const [menuPosition, setMenuPosition] = useState<{
    mouseX: number;
    mouseY: number;
  } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);
  const armedTracks = useLiveSetStore((state) => state.armedTracks);
  const selectedTrackId = useLiveSetStore((state) => state.selectedTrackId);
  const toggleArmedTrack = useLiveSetStore((state) => state.toggleArmedTrack);
  const renameTrack = useLiveSetStore((state) => state.renameTrack);
  const duplicateTrack = useLiveSetStore((state) => state.duplicateTrack);
  const deleteTrack = useLiveSetStore((state) => state.deleteTrack);
  const isSelected = selectedTrackId === track.id;
  const setTrackGain = useLiveSetStore((state) => state.setTrackGain);
  const setTrackMidiChannel = useLiveSetStore(
    (state) => state.setTrackMidiChannel
  );
  const gain = track.gain ?? 1;
  const isArmed = armedTracks.includes(track.id);
  const isMenuOpen = Boolean(menuPosition);

  const stopControlClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  const handleCloseMenu = () => {
    setMenuPosition(null);
  };

  const handleContextMenu = (e: MouseEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPosition({ mouseX: e.clientX + 2, mouseY: e.clientY - 6 });
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchStart = (e: TouchEvent<HTMLElement>) => {
    clearLongPressTimer();
    const touch = e.touches[0];
    longPressTimerRef.current = setTimeout(() => {
      suppressClickRef.current = true;
      setMenuPosition({ mouseX: touch.clientX + 2, mouseY: touch.clientY - 6 });
    }, 550);
  };

  const handleTouchMove = () => {
    clearLongPressTimer();
  };

  const handleTouchEnd = () => {
    clearLongPressTimer();
  };

  const handleRename = () => {
    handleCloseMenu();
    const nextName = window.prompt("Rename track", track.name);
    if (nextName && nextName.trim()) {
      renameTrack(track.id, nextName);
    }
  };

  const handleCopy = async () => {
    handleCloseMenu();
    const payload = JSON.stringify(track, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
    } catch (error) {
      console.error("Failed to copy track:", error);
    }
  };

  const handleDuplicate = () => {
    handleCloseMenu();
    void duplicateTrack(track.id);
  };

  const handleDelete = () => {
    handleCloseMenu();
    void deleteTrack(track.id);
  };

  return (
    <Box
      onClick={(e) => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          e.stopPropagation();
          return;
        }
        onToggleExpand();
      }}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="button"
      aria-label={expanded ? "Collapse channel" : "Expand channel"}
      aria-expanded={expanded}
      sx={{
        display: "flex",
        flexDirection: "row",
        height: "100%",
        flexShrink: 0,
        borderRight: 1,
        borderColor: "divider",
        cursor: "pointer",
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
          bgcolor:
            expanded || isSelected
              ? "rgba(42, 157, 143, 0.12)"
              : isArmed
                ? "rgba(42, 157, 143, 0.06)"
                : "transparent",
          borderLeft: 3,
          borderColor: expanded
            ? "primary.main"
            : isSelected
              ? "primary.dark"
              : isArmed
                ? "primary.dark"
                : "transparent",
        }}
      >
        <Box
          component="span"
          sx={{ display: "flex", color: "text.secondary", lineHeight: 0 }}
        >
          {expanded ? (
            <ChevronLeftIcon fontSize="small" />
          ) : (
            <ChevronRightIcon fontSize="small" />
          )}
        </Box>

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
        >
          <Slider
            orientation="vertical"
            value={gain}
            min={0}
            max={1}
            step={0.01}
            aria-label={`${track.name} gain`}
            onMouseDown={stopControlClick}
            onClick={stopControlClick}
            onChange={(_, value) =>
              setTrackGain(track.id, value as number)
            }
            sx={{
              height: 140,
              flexShrink: 0,
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

        <Select
          size="small"
          value={track.midiChannel}
          aria-label={`${track.name} MIDI channel`}
          onMouseDown={stopControlClick}
          onClick={stopControlClick}
          onChange={(e) => {
            setTrackMidiChannel(track.id, Number(e.target.value));
          }}
          sx={{
            flexShrink: 0,
            width: "100%",
            maxWidth: 72,
            fontSize: "0.65rem",
            color: "text.secondary",
            "& .MuiSelect-select": {
              py: 0.25,
              pl: 0.75,
              pr: "20px !important",
              minHeight: "unset",
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "divider",
            },
          }}
        >
          {Array.from({ length: 16 }, (_, index) => index + 1).map((channel) => (
            <MenuItem key={channel} value={channel} dense sx={{ fontSize: "0.8rem" }}>
              ch {channel}
            </MenuItem>
          ))}
        </Select>

        <ToggleButton
          value={track.id}
          selected={isArmed}
          size="small"
          sx={{ flexShrink: 0 }}
          onMouseDown={stopControlClick}
          onClick={stopControlClick}
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
          onClick={stopControlClick}
          onMouseDown={stopControlClick}
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

      <Menu
        open={isMenuOpen}
        onClose={handleCloseMenu}
        onClick={(e) => e.stopPropagation()}
        anchorReference="anchorPosition"
        anchorPosition={
          menuPosition
            ? { top: menuPosition.mouseY, left: menuPosition.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleRename}>Rename</MenuItem>
        <MenuItem onClick={handleCopy}>Copy</MenuItem>
        <MenuItem onClick={handleDuplicate}>Duplicate</MenuItem>
        <MenuItem onClick={handleDelete}>Delete</MenuItem>
      </Menu>
    </Box>
  );
}

export default Track;
