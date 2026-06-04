import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  IconButton,
  TextField,
  Slider,
  Typography,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import Widget from "./Widget";

const keys = [
  { note: "C", color: "white", midi: 60, key: "a" },
  { note: "C#", color: "black", midi: 61, key: "w" },
  { note: "D", color: "white", midi: 62, key: "s" },
  { note: "D#", color: "black", midi: 63, key: "e" },
  { note: "E", color: "white", midi: 64, key: "d" },
  { note: "F", color: "white", midi: 65, key: "f" },
  { note: "F#", color: "black", midi: 66, key: "t" },
  { note: "G", color: "white", midi: 67, key: "g" },
  { note: "G#", color: "black", midi: 68, key: "z" },
  { note: "A", color: "white", midi: 69, key: "h" },
  { note: "A#", color: "black", midi: 70, key: "u" },
  { note: "B", color: "white", midi: 71, key: "j" },
  { note: "C", color: "white", midi: 72, key: "k" },
];

const whiteKeyWidth = 40;
const blackKeyWidth = 30;
const blackKeyOffset = whiteKeyWidth - blackKeyWidth / 2;

const compactWhiteKeyWidth = 24;
const compactBlackKeyWidth = 16;
const compactBlackKeyOffset =
  compactWhiteKeyWidth - compactBlackKeyWidth / 2;
const compactWhiteKeyHeight = 56;
const compactBlackKeyHeight = 36;

interface Props {
  onKeyPressed: (note: number, velocity: number) => void;
  onKeyReleased: (note: number, velocity: number) => void;
  compact?: boolean;
}

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement ||
  (target instanceof HTMLElement && target.isContentEditable);

const MusicalKeyboard = ({ onKeyPressed, onKeyReleased, compact = false }: Props) => {
  const theme = useTheme();
  const { palette } = theme;

  const keyColors = {
    white: alpha(palette.common.white, 0.9),
    whitePressed: alpha(palette.primary.main, 0.45),
    black: palette.background.default,
    blackPressed: alpha(palette.primary.main, 0.72),
    borderPressed: palette.primary.main,
    whiteInset: alpha(palette.primary.main, 0.35),
    blackInset: alpha(palette.primary.main, 0.55),
    whiteLabel: alpha(palette.common.black, 0.55),
    blackLabel: alpha(palette.common.white, 0.85),
  };

  const numberFieldSx = (width: number) => ({
    width,
    "& .MuiInputBase-input": {
      textAlign: "center",
      fontSize: 14,
      fontWeight: 600,
      color: "text.primary",
      py: 0.75,
      px: 0.5,
    },
    "& .MuiOutlinedInput-root": {
      bgcolor: alpha(palette.common.white, 0.08),
      "& fieldset": { borderColor: alpha(palette.common.white, 0.25) },
      "&:hover fieldset": { borderColor: alpha(palette.common.white, 0.4) },
      "&.Mui-focused fieldset": { borderColor: palette.primary.main },
    },
  });
  const [octave, setOctave] = useState(0);
  const [velocity, setVelocity] = useState(100);
  const [pressedNotes, setPressedNotes] = useState<Set<number>>(() => new Set());
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const activeMouseNotesRef = useRef<Set<number>>(new Set());
  const octaveRef = useRef(octave);
  const velocityRef = useRef(velocity);

  octaveRef.current = octave;
  velocityRef.current = velocity;

  const markNotePressed = useCallback((midi: number) => {
    setPressedNotes((prev) => {
      if (prev.has(midi)) return prev;
      const next = new Set(prev);
      next.add(midi);
      return next;
    });
  }, []);

  const markNoteReleased = useCallback((midi: number) => {
    setPressedNotes((prev) => {
      if (!prev.has(midi)) return prev;
      const next = new Set(prev);
      next.delete(midi);
      return next;
    });
  }, []);

  const handleKeyPress = useCallback(
    (note: number) => {
      onKeyPressed?.(note + octaveRef.current * 12, velocityRef.current);
    },
    [onKeyPressed]
  );

  const handleKeyRelease = useCallback(
    (note: number) => {
      onKeyReleased?.(note + octaveRef.current * 12, velocityRef.current);
    },
    [onKeyReleased]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const keyObj = keys.find((key) => key.key === event.key);
      if (keyObj && !pressedKeysRef.current.has(event.key)) {
        pressedKeysRef.current.add(event.key);
        markNotePressed(keyObj.midi);
        handleKeyPress(keyObj.midi);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const keyObj = keys.find((key) => key.key === event.key);
      if (keyObj && pressedKeysRef.current.has(event.key)) {
        pressedKeysRef.current.delete(event.key);
        markNoteReleased(keyObj.midi);
        handleKeyRelease(keyObj.midi);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyPress, handleKeyRelease, markNotePressed, markNoteReleased]);

  useEffect(() => {
    const handleWindowMouseUp = () => {
      activeMouseNotesRef.current.forEach((note) => {
        markNoteReleased(note);
        handleKeyRelease(note);
      });
      activeMouseNotesRef.current.clear();
    };

    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => window.removeEventListener("mouseup", handleWindowMouseUp);
  }, [handleKeyRelease, markNoteReleased]);

  const handleMouseDown = (note: number) => {
    if (activeMouseNotesRef.current.has(note)) return;
    activeMouseNotesRef.current.add(note);
    markNotePressed(note);
    handleKeyPress(note);
  };

  const handleMouseUp = (note: number) => {
    if (!activeMouseNotesRef.current.has(note)) return;
    activeMouseNotesRef.current.delete(note);
    markNoteReleased(note);
    handleKeyRelease(note);
  };

  const keyLayout = compact
    ? {
        whiteKeyWidth: compactWhiteKeyWidth,
        blackKeyWidth: compactBlackKeyWidth,
        blackKeyOffset: compactBlackKeyOffset,
        whiteKeyHeight: compactWhiteKeyHeight,
        blackKeyHeight: compactBlackKeyHeight,
        keyboardHeight: compactWhiteKeyHeight,
        fontSize: "9px",
      }
    : {
        whiteKeyWidth,
        blackKeyWidth,
        blackKeyOffset,
        whiteKeyHeight: 150,
        blackKeyHeight: 100,
        keyboardHeight: 150,
        fontSize: "12px",
      };

  const clampOctave = (value: number) => Math.min(4, Math.max(-2, value));
  const clampVelocity = (value: number) =>
    Math.min(127, Math.max(0, Number.isFinite(value) ? value : 0));

  const controls = (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 2 : 3,
        flexShrink: 0,
        ...(compact ? { minWidth: 260 } : { marginBottom: "12px" }),
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", fontWeight: 600, minWidth: 28 }}
        >
          Oct
        </Typography>
        <IconButton
          size="small"
          aria-label="Lower octave"
          onClick={() => setOctave((o) => clampOctave(o - 1))}
        >
          <ChevronLeft fontSize="small" />
        </IconButton>
        <TextField
          type="number"
          size="small"
          value={octave}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setOctave(clampOctave(Number(event.target.value)))
          }
          slotProps={{
            htmlInput: { min: -2, max: 4, step: 1 },
          }}
          sx={numberFieldSx(compact ? 48 : 56)}
        />
        <IconButton
          size="small"
          aria-label="Raise octave"
          onClick={() => setOctave((o) => clampOctave(o + 1))}
        >
          <ChevronRight fontSize="small" />
        </IconButton>
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flex: compact ? 1 : undefined,
          minWidth: compact ? 140 : 200,
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", fontWeight: 600, minWidth: 24 }}
        >
          Vel
        </Typography>
        <Slider
          size="small"
          value={velocity}
          onChange={(_event, value) => setVelocity(clampVelocity(value as number))}
          min={0}
          max={127}
          step={1}
          sx={{
            flex: 1,
            minWidth: compact ? 80 : 120,
            color: "primary.main",
            "& .MuiSlider-thumb": { width: 14, height: 14 },
          }}
        />
        <TextField
          type="number"
          size="small"
          value={velocity}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setVelocity(clampVelocity(Number(event.target.value)))
          }
          slotProps={{
            htmlInput: { min: 0, max: 127, step: 1 },
          }}
          sx={numberFieldSx(compact ? 52 : 60)}
        />
      </Box>
    </Box>
  );

  const keyboard = (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        position: "relative",
        height: keyLayout.keyboardHeight,
        minWidth: keys.filter((k) => k.color === "white").length * keyLayout.whiteKeyWidth,
        flex: compact ? 1 : undefined,
        overflowX: compact ? "auto" : undefined,
      }}
    >
      {keys.map((key, index) => {
        const isBlackKey = key.color === "black";
        const whiteKeyOffset =
          keys.slice(0, index).filter((k) => k.color === "white").length *
          keyLayout.whiteKeyWidth;

        const offset = isBlackKey
          ? whiteKeyOffset - keyLayout.blackKeyOffset
          : whiteKeyOffset;

        const isPressed = pressedNotes.has(key.midi);
        const baseColor = isBlackKey ? keyColors.black : keyColors.white;
        const pressedColor = isBlackKey
          ? keyColors.blackPressed
          : keyColors.whitePressed;

        return (
          <Box
            key={index}
            sx={{
              width: isBlackKey ? keyLayout.blackKeyWidth : keyLayout.whiteKeyWidth,
              height: isBlackKey ? keyLayout.blackKeyHeight : keyLayout.whiteKeyHeight,
              backgroundColor: isPressed ? pressedColor : baseColor,
              margin: "1px",
              zIndex: isBlackKey ? 2 : 1,
              position: "absolute",
              left: offset,
              top: isPressed && !isBlackKey ? 3 : 0,
              cursor: "pointer",
              border: isPressed
                ? `2px solid ${keyColors.borderPressed}`
                : `1px solid ${alpha(palette.common.black, 0.5)}`,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              color: isBlackKey ? keyColors.blackLabel : keyColors.whiteLabel,
              fontSize: keyLayout.fontSize,
              flexShrink: 0,
              userSelect: "none",
              transition: "background-color 0.05s, top 0.05s, border-color 0.05s",
              boxShadow: isPressed
                ? isBlackKey
                  ? `inset 0 -2px 8px ${keyColors.blackInset}`
                  : `inset 0 2px 6px ${keyColors.whiteInset}`
                : "none",
            }}
            onMouseDown={() => handleMouseDown(key.midi)}
            onMouseUp={() => handleMouseUp(key.midi)}
            onMouseLeave={() => handleMouseUp(key.midi)}
          >
            {!compact && key.note}
          </Box>
        );
      })}
    </Box>
  );

  if (compact) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          width: "100%",
          minHeight: keyLayout.keyboardHeight,
        }}
      >
        {controls}
        {keyboard}
      </Box>
    );
  }

  return (
    <Widget title="VKeyboard">
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {controls}
        {keyboard}
      </Box>
    </Widget>
  );
};

export default MusicalKeyboard;
