import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Grid } from "@mui/material";
import Widget from "./Widget";

const PAD_KEYS = ["a", "s", "d", "f", "g", "h", "j", "k"];

interface PadEntry {
  note: number;
  label: string;
  key: string;
}

interface Props {
  onKeyPressed: (note: number, velocity: number) => void;
  onKeyReleased: (note: number, velocity: number) => void;
  config: Record<string, { type?: string; path?: string }>;
}

function getPadLabel(note: number, value: { type?: string; path?: string }) {
  if (value.type) {
    return value.type;
  }
  if (value.path) {
    const fileName = value.path.split("/").pop() ?? value.path;
    return fileName.replace(/\.[^.]+$/, "");
  }
  return String(note);
}

const DrumPad = ({ onKeyPressed, onKeyReleased, config }: Props) => {
  const [velocity] = useState(100);
  const [pressedPads, setPressedPads] = useState<Set<number>>(new Set());
  const pressedPadsRef = useRef<Set<number>>(new Set());

  const pads: PadEntry[] = useMemo(() => {
    return Object.entries(config ?? {})
      .map(([note, value], index) => ({
        note: Number(note),
        label: getPadLabel(Number(note), value),
        key: PAD_KEYS[index] ?? "",
      }))
      .sort((a, b) => a.note - b.note);
  }, [config]);

  const setPadPressed = (note: number, pressed: boolean) => {
    if (pressed) {
      pressedPadsRef.current.add(note);
    } else {
      pressedPadsRef.current.delete(note);
    }
    setPressedPads(new Set(pressedPadsRef.current));
  };

  const triggerPad = (note: number) => {
    onKeyPressed?.(note, velocity);
  };

  const releasePad = (note: number) => {
    onKeyReleased?.(note, velocity);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const pad = pads.find((entry) => entry.key === event.key);
      if (!pad || pressedPadsRef.current.has(pad.note)) return;

      setPadPressed(pad.note, true);
      triggerPad(pad.note);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const pad = pads.find((entry) => entry.key === event.key);
      if (!pad || !pressedPadsRef.current.has(pad.note)) return;

      setPadPressed(pad.note, false);
      releasePad(pad.note);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [pads, velocity]);

  return (
    <Widget title="DrumPad">
      <Box sx={{ width: "100%", padding: 2 }}>
        <Grid container spacing={2}>
          {pads.map((pad) => (
            <Grid
              size={{ xs: 3 }}
              key={pad.note}
              onMouseDown={() => {
                if (pressedPadsRef.current.has(pad.note)) return;
                setPadPressed(pad.note, true);
                triggerPad(pad.note);
              }}
              onMouseUp={() => {
                if (!pressedPadsRef.current.has(pad.note)) return;
                setPadPressed(pad.note, false);
                releasePad(pad.note);
              }}
              onMouseLeave={() => {
                if (!pressedPadsRef.current.has(pad.note)) return;
                setPadPressed(pad.note, false);
                releasePad(pad.note);
              }}
              onTouchStart={(event) => {
                event.preventDefault();
                if (pressedPadsRef.current.has(pad.note)) return;
                setPadPressed(pad.note, true);
                triggerPad(pad.note);
              }}
              onTouchEnd={(event) => {
                event.preventDefault();
                if (!pressedPadsRef.current.has(pad.note)) return;
                setPadPressed(pad.note, false);
                releasePad(pad.note);
              }}
              sx={{
                height: 100,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                cursor: "pointer",
                userSelect: "none",
                backgroundColor: pressedPads.has(pad.note)
                  ? "primary.main"
                  : "secondary.main",
                color: pressedPads.has(pad.note)
                  ? "primary.contrastText"
                  : "secondary.contrastText",
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                textTransform: "capitalize",
              }}
            >
              <Box component="span" sx={{ fontWeight: 600 }}>
                {pad.label}
              </Box>
              <Box component="span" sx={{ fontSize: 12, opacity: 0.8 }}>
                {pad.note}
                {pad.key ? ` · ${pad.key}` : ""}
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Widget>
  );
};

export default DrumPad;
