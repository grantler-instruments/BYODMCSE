import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import useLiveSetStore from "../store/liveSet";

interface Props {
  onClose?: () => void;
}

function MidiPanel({ onClose }: Props) {
  const midiSettings = useLiveSetStore((state) => state.midiSettings);
  const midiInputs = useLiveSetStore((state) => state.midiInputs);
  const midiError = useLiveSetStore((state) => state.midiError);
  const setMidiSettings = useLiveSetStore((state) => state.setMidiSettings);
  const listenToMidi = useLiveSetStore((state) => state.listenToMidi);

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        p: 2.5,
        gap: 2,
      }}
    >
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <Typography variant="h6" color="primary">
          MIDI input
        </Typography>
        {onClose && (
          <IconButton aria-label="Close MIDI settings" onClick={onClose} edge="end">
            <CloseIcon />
          </IconButton>
        )}
      </Stack>

      <Stack spacing={1.5}>
        <FormControlLabel
          control={
            <Switch
              checked={midiSettings.enabled}
              onChange={(event) =>
                void setMidiSettings({ enabled: event.target.checked })
              }
            />
          }
          label={midiSettings.enabled ? "MIDI enabled" : "MIDI disabled"}
        />

        <FormControl size="small" fullWidth disabled={!midiSettings.enabled}>
          <InputLabel id="midi-input-label">Input port</InputLabel>
          <Select
            labelId="midi-input-label"
            label="Input port"
            value={midiSettings.inputId ?? ""}
            onChange={(event) =>
              void setMidiSettings({ inputId: event.target.value || null })
            }
          >
            <MenuItem value="">
              <em>First available input</em>
            </MenuItem>
            {midiSettings.inputId &&
              !midiInputs.some((input) => input.id === midiSettings.inputId) && (
                <MenuItem value={midiSettings.inputId} disabled>
                  Selected input unavailable
                </MenuItem>
              )}
            {midiInputs.map((input) => (
              <MenuItem key={input.id} value={input.id}>
                {input.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {midiSettings.enabled && midiInputs.length === 0 && !midiError && (
          <Typography variant="caption" color="text.secondary">
            No MIDI input ports found.
          </Typography>
        )}
        {midiError && (
          <Typography variant="caption" color="error">
            {midiError}
          </Typography>
        )}
        <Button
          variant="outlined"
          onClick={() => void listenToMidi()}
          disabled={!midiSettings.enabled}
          fullWidth
        >
          Refresh input ports
        </Button>
        <Typography variant="caption" color="text.secondary">
          MIDI settings are saved with the current live set.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Connect a device, then refresh to update the available ports.
        </Typography>
      </Stack>
    </Box>
  );
}

export default MidiPanel;
