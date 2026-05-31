import { Box } from "@mui/material";
import Instrument from "./Instrument";
import Effect from "./Effect";

interface Props extends React.PropsWithChildren {
  track: any;
  layout?: "strip" | "row";
}

function TrackDetails({ children, track, layout = "row" }: Props) {
  const instrument = track?.instrument;
  const isStrip = layout === "strip";
  return (
    <Box
      sx={{
        height: isStrip ? "auto" : "100%",
        minHeight: isStrip ? 200 : 280,
        overflowX: isStrip ? "visible" : "auto",
        overflowY: isStrip ? "visible" : "hidden",
        display: "flex",
        flexDirection: isStrip ? "column" : "row",
        gap: isStrip ? 2 : 3,
        alignItems: isStrip ? "stretch" : "flex-start",
      }}
    >
      {children}
      {instrument && <Instrument instrument={instrument}></Instrument>}
      {track?.effects?.length > 0 && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: isStrip ? 1 : 2,
            width: isStrip ? "100%" : "auto",
          }}
        >
          {track.effects.map((effect: any) => (
            <Effect key={effect.id} effect={effect} />
          ))}
        </Box>
      )}
    </Box>
  );
}

export default TrackDetails;
