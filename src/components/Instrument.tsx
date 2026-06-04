import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Typography,
} from "@mui/material";
import Parameter from "./Parameter.";

interface Props {
  instrument: any;
}

const Instrument = ({ instrument }: Props) => {
  if (!instrument) {
    return <></>;
  }

  const parameters = Object.entries(instrument?.parameters ?? {});
  const numericParams = parameters.filter(([, p]: any[]) => typeof p.value === "number");
  const otherParams = parameters.filter(([, p]: any[]) => typeof p.value !== "number");

  return (
    <Accordion
      disableGutters
      elevation={0}
      defaultExpanded
      sx={{
        bgcolor: "rgb(24, 24, 24)",
        borderRadius: "24px",
        overflow: "hidden",
        width: "100%",
        "&:before": { display: "none" },
        "&.Mui-expanded": { margin: 0 },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: "primary.main" }} />}
        sx={{
          minHeight: 48,
          px: 1.5,
          "& .MuiAccordionSummary-content": { my: 1 },
        }}
      >
        <Typography variant="subtitle1" color="primary" fontWeight={600}>
          {instrument.name || instrument.type}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1.5, pt: 0, pb: 1.5 }}>
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

export default Instrument;
