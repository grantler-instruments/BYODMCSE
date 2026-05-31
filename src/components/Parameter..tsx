import {
  Slider,
  Select,
  MenuItem,
  Box,
  Typography,
  Switch,
} from "@mui/material";
import useLiveSetStore from "../store/liveSet";

interface Props {
  parameter: any;
}

const Parameter = ({ parameter }: Props) => {
  const setParameterValue = useLiveSetStore((state) => state.setParameterValue);
  const { value, options, name } = parameter;
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
            min={options?.min || 0}
            max={options?.max || 1}
            step={0.001}
            sx={{ width: "100%" }}
            onChange={(event: any) => {
              setParameterValue(parameter.id, event.target.value);
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
                {option}
              </MenuItem>
            ))}
          </Select>
        )}
      </Box>
    </Box>
  );

  return <pre>{JSON.stringify(parameter, null, 4)}</pre>;
};

export default Parameter;
