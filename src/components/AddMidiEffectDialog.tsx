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
} from "@mui/material";
import useLiveSetStore from "../store/liveSet";
import {
  MIDI_EFFECT_OPTIONS,
  type MidiEffectType,
} from "../audio/midiEffectFactory";

interface Props {
  trackId: string;
  open: boolean;
  onClose: () => void;
}

function AddMidiEffectDialog({ trackId, open, onClose }: Props) {
  const addMidiEffect = useLiveSetStore((state) => state.addMidiEffect);
  const [effectType, setEffectType] = useState<MidiEffectType>("transpose");

  useEffect(() => {
    if (open) {
      setEffectType("transpose");
    }
  }, [open]);

  const handleAdd = () => {
    addMidiEffect(trackId, effectType);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add MIDI effect</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="midi-effect-type-label">MIDI effect</InputLabel>
            <Select
              labelId="midi-effect-type-label"
              label="MIDI effect"
              value={effectType}
              onChange={(e) =>
                setEffectType(e.target.value as MidiEffectType)
              }
            >
              {MIDI_EFFECT_OPTIONS.map((option) => (
                <MenuItem key={option.type} value={option.type}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleAdd} variant="contained">
          Add effect
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddMidiEffectDialog;
