import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  List,
  ListItem,
  Typography,
} from "@mui/material";
import Parameter from "./Parameter.";

interface Props {
  effect: any;
}

const effectPanelSx = {
  bgcolor: "rgb(24, 24, 24)",
  borderRadius: "24px",
  overflow: "hidden",
  width: "100%",
  "&:before": { display: "none" },
  "&.Mui-expanded": { margin: 0 },
};

const Effect = ({ effect }: Props) => {
  if (!effect) {
    return <></>;
  }
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
        <Typography variant="subtitle1" color="primary" fontWeight={600}>
          {effect.name || effect.type}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1.5, pt: 0, pb: 1.5 }}>
        <List disablePadding sx={{ width: "100%" }}>
          {Object.entries(effect?.parameters)?.map(
            ([id, parameter]: any[]) => {
              return (
                <ListItem key={id} disablePadding sx={{ width: "100%" }}>
                  {<Parameter parameter={parameter}></Parameter>}
                </ListItem>
              );
            }
          )}
        </List>
      </AccordionDetails>
    </Accordion>
  );
};

export default Effect;
