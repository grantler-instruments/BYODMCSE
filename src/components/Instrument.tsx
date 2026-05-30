import {
  List,
  ListItem,
} from "@mui/material";
import Parameter from "./Parameter.";
import Widget from "./Widget";

interface Props {
  instrument: any;
}

const Instrument = ({ instrument }: Props) => {
  if (!instrument) {
    return <></>;
  }
  return (
    <Widget title={instrument.name || instrument.type}>
      <List disablePadding sx={{ width: "100%" }}>
        {Object.entries(instrument?.parameters)?.map(
          ([id, parameter]: any[]) => {
            return (
              <ListItem key={id} disablePadding sx={{ width: "100%" }}>
                {<Parameter parameter={parameter}></Parameter>}
              </ListItem>
            );
          }
        )}
      </List>
    </Widget>
  );
};

export default Instrument;
