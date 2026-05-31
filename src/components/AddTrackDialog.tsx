import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import useLiveSetStore from "../store/liveSet";
import {
  INSTRUMENT_OPTIONS,
  suggestMidiChannel,
  type InstrumentType,
} from "../audio/trackFactory";

interface Props {
  open: boolean;
  onClose: () => void;
}

function AddTrackDialog({ open, onClose }: Props) {
  const tracks = useLiveSetStore((state) => state.tracks);
  const addTrack = useLiveSetStore((state) => state.addTrack);
  const [name, setName] = useState("");
  const [instrumentType, setInstrumentType] = useState<InstrumentType>("synth");
  const [midiChannel, setMidiChannel] = useState(1);

  useEffect(() => {
    if (open) {
      setName("");
      setInstrumentType("synth");
      setMidiChannel(suggestMidiChannel(tracks));
    }
  }, [open, tracks]);

  const handleAdd = () => {
    addTrack(instrumentType, midiChannel, name || undefined);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add track</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Name"
            placeholder={`e.g. ${INSTRUMENT_OPTIONS.find((o) => o.type === instrumentType)?.label ?? "Track"}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            size="small"
          />
          <FormControl fullWidth size="small">
            <InputLabel id="instrument-type-label">Instrument</InputLabel>
            <Select
              labelId="instrument-type-label"
              label="Instrument"
              value={instrumentType}
              onChange={(e) =>
                setInstrumentType(e.target.value as InstrumentType)
              }
            >
              {INSTRUMENT_OPTIONS.map((option) => (
                <MenuItem key={option.type} value={option.type}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel id="midi-channel-label">MIDI channel</InputLabel>
            <Select
              labelId="midi-channel-label"
              label="MIDI channel"
              value={midiChannel}
              onChange={(e) => setMidiChannel(Number(e.target.value))}
            >
              {Array.from({ length: 16 }, (_, index) => index + 1).map(
                (channel) => (
                  <MenuItem key={channel} value={channel}>
                    {channel}
                  </MenuItem>
                )
              )}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleAdd} variant="contained">
          Add track
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddTrackDialog;
