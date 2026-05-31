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
import { EFFECT_OPTIONS, type EffectType } from "../audio/effectFactory";

interface Props {
  trackId: string;
  open: boolean;
  onClose: () => void;
}

function AddEffectDialog({ trackId, open, onClose }: Props) {
  const addEffect = useLiveSetStore((state) => state.addEffect);
  const [effectType, setEffectType] = useState<EffectType>("delay");

  useEffect(() => {
    if (open) {
      setEffectType("delay");
    }
  }, [open]);

  const handleAdd = () => {
    addEffect(trackId, effectType);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add effect</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="effect-type-label">Effect</InputLabel>
            <Select
              labelId="effect-type-label"
              label="Effect"
              value={effectType}
              onChange={(e) => setEffectType(e.target.value as EffectType)}
            >
              {EFFECT_OPTIONS.map((option) => (
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

export default AddEffectDialog;
