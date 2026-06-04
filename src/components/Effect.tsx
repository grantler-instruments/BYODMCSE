import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  IconButton,
  Switch,
  Typography,
} from "@mui/material";
import Parameter from "./Parameter.";
import useLiveSetStore from "../store/liveSet";

interface Props {
  effect: any;
  dragHandleProps?: Record<string, any>;
}

const effectPanelSx = {
  bgcolor: "rgb(24, 24, 24)",
  borderRadius: "24px",
  overflow: "hidden",
  width: "100%",
  "&:before": { display: "none" },
  "&.Mui-expanded": { margin: 0 },
};

const Effect = ({ effect, dragHandleProps }: Props) => {
  const setParameterValue = useLiveSetStore((state) => state.setParameterValue);

  if (!effect) {
    return <></>;
  }

  const parameters = Object.entries(effect?.parameters ?? {});
  const activeEntry = parameters.find(([key]) => key === "active");
  const activeParam = activeEntry?.[1] as { id: string; value: boolean } | undefined;
  const isActive = activeParam?.value ?? true;

  const numericParams = parameters.filter(
    ([key, p]: any[]) => key !== "mode" && typeof p.value === "number"
  );
  const modeEntry = parameters.find(([key]) => key === "mode");
  const otherParams = parameters.filter(
    ([key, p]: any[]) =>
      key !== "active" && key !== "mode" && typeof p.value !== "number"
  );

  const stopAccordionToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Accordion disableGutters elevation={0} sx={effectPanelSx}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: "primary.main" }} />}
        sx={{
          minHeight: 48,
          px: 1.5,
          "& .MuiAccordionSummary-content": { my: 1 },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            pr: 1,
            gap: 1,
          }}
        >
          <IconButton
            size="small"
            aria-label="Reorder effect"
            sx={{ cursor: "grab" }}
            {...dragHandleProps}
            onMouseDown={(e: React.MouseEvent) => {
              e.stopPropagation();
            }}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
            }}
          >
            <DragIndicatorIcon fontSize="small" />
          </IconButton>
          <Typography
            variant="subtitle1"
            color={isActive ? "primary" : "text.secondary"}
            fontWeight={600}
            sx={{ opacity: isActive ? 1 : 0.65 }}
          >
            {effect.name || effect.type}
          </Typography>
          {activeParam && (
            <Switch
              size="small"
              checked={activeParam.value}
              inputProps={{ "aria-label": `${effect.name || effect.type} active` }}
              onMouseDown={stopAccordionToggle}
              onClick={stopAccordionToggle}
              onChange={() => {
                setParameterValue(activeParam.id, !activeParam.value);
              }}
            />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1.5, pt: 0, pb: 1.5 }}>
        {modeEntry && (
          <Box sx={{ mb: 1.5 }}>
            <Parameter parameter={modeEntry[1]} />
          </Box>
        )}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1.5,
            justifyContent: "flex-start",
            alignItems: "flex-start",
          }}
        >
          {numericParams.map(([id, parameter]: any[]) => (
            <Parameter key={id} parameter={parameter} variant="knob" />
          ))}
        </Box>
        {otherParams.length > 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mt: 1 }}>
            {otherParams.map(([id, parameter]: any[]) => (
              <Parameter key={id} parameter={parameter} />
            ))}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default Effect;
