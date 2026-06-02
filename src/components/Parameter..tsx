import {
  Slider,
  Select,
  MenuItem,
  Box,
  Typography,
  Switch,
} from "@mui/material";
import { Knob } from "./Knob";
import useLiveSetStore from "../store/liveSet";

interface Props {
  parameter: any;
  variant?: "slider" | "knob";
}

function knobStep(min: number, max: number) {
  const range = max - min;
  if (range <= 1) return 0.001;
  if (range <= 10) return 0.01;
  if (range <= 100) return 0.1;
  return 1;
}

function formatOptionLabel(option: string) {
  return option.charAt(0).toUpperCase() + option.slice(1);
}

function formatParamName(name: string) {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());
}

const Parameter = ({ parameter, variant = "slider" }: Props) => {
  const setParameterValue = useLiveSetStore((state) => state.setParameterValue);
  const { value, options, name } = parameter;
  const min = options?.min ?? 0;
  const max = options?.max ?? 1;

  if (variant === "knob" && typeof value === "number") {
    return (
      <Knob
        value={value}
        min={min}
        max={max}
        step={knobStep(min, max)}
        size={56}
        label={formatParamName(name)}
        onChange={(newValue: number) => setParameterValue(parameter.id, newValue)}
      />
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        gap: 2,
        py: 0.5,
      }}
    >
      <Typography
        sx={{
          flex: "0 0 35%",
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {name}
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {typeof value === "boolean" && (
          <Switch
            checked={value}
            onChange={() => {
              setParameterValue(parameter.id, !value);
            }}
          />
        )}
        {typeof value === "number" && (
          <Slider
            value={value}
            min={min}
            max={max}
            step={0.001}
            sx={{ width: "100%" }}
            onChange={(_, newValue) => {
              setParameterValue(parameter.id, newValue);
            }}
          />
        )}
        {typeof value === "string" && Array.isArray(options) && (
          <Select
            fullWidth
            value={value}
            label={name}
            size="small"
            onChange={(event) => {
              setParameterValue(parameter.id, event.target.value);
            }}
          >
            {options?.map((option: any, index: number) => (
              <MenuItem key={index} value={option}>
                {formatOptionLabel(option)}
              </MenuItem>
            ))}
          </Select>
        )}
      </Box>
    </Box>
  );
};

export default Parameter;
