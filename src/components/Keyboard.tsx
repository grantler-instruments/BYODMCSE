import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  IconButton,
  TextField,
  Slider,
  Grid,
} from "@mui/material";
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
  const [octave, setOctave] = useState(0);
  const [velocity, setVelocity] = useState(100);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const activeMouseNotesRef = useRef<Set<number>>(new Set());
  const octaveRef = useRef(octave);
  const velocityRef = useRef(velocity);

  octaveRef.current = octave;
  velocityRef.current = velocity;

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
        handleKeyPress(keyObj.midi);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const keyObj = keys.find((key) => key.key === event.key);
      if (keyObj && pressedKeysRef.current.has(event.key)) {
        pressedKeysRef.current.delete(event.key);
        handleKeyRelease(keyObj.midi);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyPress, handleKeyRelease]);

  useEffect(() => {
    const handleWindowMouseUp = () => {
      activeMouseNotesRef.current.forEach((note) => {
        handleKeyRelease(note);
      });
      activeMouseNotesRef.current.clear();
    };

    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => window.removeEventListener("mouseup", handleWindowMouseUp);
  }, [handleKeyRelease]);

  const handleMouseDown = (note: number) => {
    if (activeMouseNotesRef.current.has(note)) return;
    activeMouseNotesRef.current.add(note);
    handleKeyPress(note);
  };

  const handleMouseUp = (note: number) => {
    if (!activeMouseNotesRef.current.has(note)) return;
    activeMouseNotesRef.current.delete(note);
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

  const controls = (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 1.5 : 3,
        flexShrink: 0,
        ...(compact ? { minWidth: 220 } : { marginBottom: "12px" }),
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <IconButton size="small" onClick={() => setOctave(octave - 1)}>
          <ChevronLeft fontSize="small" />
        </IconButton>
        <TextField
          type="number"
          size="small"
          value={octave}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setOctave(Number(event.target.value))
          }
          slotProps={{
            htmlInput: { min: -2, max: 4, step: 1 },
            input: { sx: { width: compact ? 40 : 56, py: 0.5 } },
          }}
        />
        <IconButton size="small" onClick={() => setOctave(octave + 1)}>
          <ChevronRight fontSize="small" />
        </IconButton>
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flex: compact ? 1 : undefined,
          minWidth: compact ? 120 : undefined,
        }}
      >
        <Slider
          size="small"
          value={velocity}
          onChange={(_event, value) => setVelocity(value as number)}
          min={0}
          max={127}
          step={1}
          sx={{ flex: 1, minWidth: compact ? 72 : 120 }}
        />
        <TextField
          type="number"
          size="small"
          value={velocity}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setVelocity(Number(event.target.value))
          }
          slotProps={{
            htmlInput: { min: 0, max: 127, step: 1 },
            input: { sx: { width: compact ? 44 : 56, py: 0.5 } },
          }}
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

        return (
          <Box
            key={index}
            sx={{
              width: isBlackKey ? keyLayout.blackKeyWidth : keyLayout.whiteKeyWidth,
              height: isBlackKey ? keyLayout.blackKeyHeight : keyLayout.whiteKeyHeight,
              backgroundColor: key.color,
              margin: "1px",
              zIndex: isBlackKey ? 2 : 1,
              position: "absolute",
              left: offset,
              top: 0,
              cursor: "pointer",
              border: "1px solid #000",
              boxSizing: "border-box",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              color: isBlackKey ? "white" : "black",
              fontSize: keyLayout.fontSize,
              flexShrink: 0,
            }}
            onMouseDown={() => handleMouseDown(key.midi)}
            onMouseUp={() => handleMouseUp(key.midi)}
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
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Box sx={{ display: "flex", gap: 3, marginBottom: "12px" }}>
          <Box>
            <Grid container spacing={3}>
              <Grid size={{ xs: 3 }}>
                <IconButton onClick={() => setOctave(octave - 1)}>
                  <ChevronLeft></ChevronLeft>
                </IconButton>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  type="number"
                  value={octave}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setOctave(Number(event.target.value))
                  }
                  slotProps={{ htmlInput: { min: -2, max: 4, step: 1 } }}
                />
              </Grid>
              <Grid size={{ xs: 3 }}>
                <IconButton onClick={() => setOctave(octave + 1)}>
                  <ChevronRight></ChevronRight>
                </IconButton>
              </Grid>
            </Grid>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Grid container spacing={3} sx={{ width: "100%" }}>
              <Grid size={{ xs: 9 }}>
                <Slider
                  value={velocity}
                  onChange={(_event, value) => setVelocity(value as number)}
                  min={0}
                  max={127}
                  step={1}
                />
              </Grid>
              <Grid size={{ xs: 3 }}>
                <TextField
                  type="number"
                  value={velocity}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setVelocity(Number(event.target.value))
                  }
                  slotProps={{ htmlInput: { min: 0, max: 127, step: 1 } }}
                />
              </Grid>
            </Grid>
          </Box>
        </Box>
        {keyboard}
      </Box>
    </Widget>
  );
};

export default MusicalKeyboard;
