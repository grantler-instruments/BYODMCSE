import React, { useEffect, useState } from "react";
import {
  Box,
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

interface Props {
  onKeyPressed: (note: number, velocity: number) => void;
  onKeyReleased: (note: number, velocity: number) => void;
  config: any;
}

const DrumPad = ({ onKeyPressed, onKeyReleased, config }: Props) => {
  const [octave, setOctave] = useState(0);
  const [velocity, setVelocity] = useState(100);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (event: any) => {
      const keyObj = keys.find((key) => key.key === event.key);
      if (keyObj && !pressedKeys.has(event.key)) {
        setPressedKeys((prev) => new Set(prev).add(event.key));
        handleKeyPress(keyObj.midi);
      }
    };

    const handleKeyUp = (event: any) => {
      const keyObj = keys.find((key) => key.key === event.key);
      if (keyObj) {
        setPressedKeys((prev) => {
          const newSet = new Set(prev);
          newSet.delete(event.key);
          return newSet;
        });
        handleKeyRelease(keyObj.midi);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [pressedKeys]);

  const handleKeyPress = (note: number) => {
    if (onKeyPressed) {
      onKeyPressed(note + octave * 12, velocity);
    }
  };

  const handleKeyRelease = (note: number) => {
    if (onKeyReleased) {
      onKeyReleased(note + octave * 12, velocity);
    }
  };

  const pads = [1,2,3,4,5,6,7,8]

  return (
    <Widget title="DrumPad">
      <Box sx={{ width: "100%", padding: 2 }}>
        <Grid container spacing={2}>
          {pads.map((_, index) => (
            <Grid
              size={{ xs: 3 }}
              key={index}
              sx={{
                height: 100,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                cursor: "pointer",
                backgroundColor: "secondary",
                border: "1px solid black"
              }}
            >
              Pad {index + 1}
            </Grid>
          ))}
        </Grid>
      </Box>
    </Widget>
  );
};

export default DrumPad;
